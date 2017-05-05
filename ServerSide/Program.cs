using System.Collections.Generic;
using System.Data;
using System.Net;
using MySql.Data.MySqlClient;
using System.Threading.Tasks;
using System.IO;
using ServerSide.Properties;
using System;
using System.Reflection;
using System.Net.Sockets;

namespace ServerSide
{
    class Program
    {
        private static HttpListener listener;


        /// <summary>
        /// Inicialização do console
        /// </summary>
        /// <param name="args">Argumentos da linha de comando</param>
        static void Main(string[] args)
        {
            // Inicializa o servidor Http na porta configurada
            listener = new HttpListener();
            listener.Prefixes.Add(string.Format("http://*:{0}/", Settings.Default.Port));

            try
            {
                listener.Start();
            }
            catch (Exception e)
            {
                Console.WriteLine("Falha ao inicializar o servidor: " + e.Message);
                return;
            }

            Console.WriteLine("Servidor HTTP inicializado com sucesso na porta " + Settings.Default.Port);
            Console.WriteLine();

            // Roda uma thread que responde as requisições feitas ao servidor
            Task task = RespondRequestsAsync();
            task.Wait();
        }


        /// <summary>
        /// Responde requisições ao sistema de forma asíncrona
        /// </summary>
        protected static Task RespondRequestsAsync()
        {
            return Task.Run(() =>
            {
                while (listener.IsListening)
                {
                    HttpListenerContext ctx = listener.GetContext();
                    Task.Run(() => ProcessRequest(ctx));
                }
            });
        }

        /// <summary>
        /// Processa uma requisição
        /// </summary>
        /// <param name="ctx">HttpListenerContext recebido pelo listener</param>
        private static void ProcessRequest(HttpListenerContext ctx)
        {
            HttpListenerRequest request = ctx.Request;
            string prot;
            using (StreamReader reader = new StreamReader(request.InputStream))
                prot = reader.ReadToEnd();

            // O nome do locus não deve ser vazio ou estar em branco
            if (string.IsNullOrWhiteSpace(prot))
            {
                using (StreamWriter writer = new StreamWriter(ctx.Response.OutputStream))
                    writer.Write("empty locus name");
                ctx.Response.Close();
                return;
            }

            Console.WriteLine("" + ctx.Request.RemoteEndPoint + " requisitou as interações para `" + prot + "'");

            // Define a string de conexão
            MySqlConnection connection;
            Assembly assembly = Assembly.GetCallingAssembly();
            using (StreamReader r = new StreamReader(assembly.GetManifestResourceStream("ServerSide.db.dat")))
                connection = new MySqlConnection(r.ReadToEnd());

            // Abre a conexão
            try
            {
                connection.Open();
            }
            catch (Exception e)
            {
                Console.WriteLine("Falha na conexão com o banco de dados: " + e.Message);

                using (StreamWriter writer = new StreamWriter(ctx.Response.OutputStream))
                    writer.Write("failed: DB offline");
                ctx.Response.Close();
                return;
            }

            // Verifica se a conexão está aberta
            if (connection.State == ConnectionState.Open)
            {
                // Verifica se existe cache para esta busca
                MySqlCommand command = new MySqlCommand("SELECT interactions FROM interaction_cache WHERE locus=@prot", connection);
                command.Parameters.AddWithValue("@prot", prot);

                MySqlDataReader result = command.ExecuteReader();

                List<string> results;
                string interactions;

                // Se não houver cache, executa a consulta completa e armazena o cache
                if (!result.HasRows)
                {
                    result.Close();
                    command.Dispose();

                    // Seleciona todas as interações onde o locus procurado esteja como locusA ou locusB
                    command = new MySqlCommand("SELECT locusA, locusB FROM interactome WHERE locusA=@prot or locusB=@prot", connection);
                    command.Parameters.AddWithValue("@prot", prot);
                    result = command.ExecuteReader();

                    // Se não achou nenhuma entrada com aquela proteína, ela não existe
                    if (!result.HasRows)
                    {
                        result.Close();

                        Console.WriteLine("O locus requisitado por " + ctx.Request.RemoteEndPoint + " não foi encontrado no banco de dados");

                        using (StreamWriter writer = new StreamWriter(ctx.Response.OutputStream))
                            writer.Write("404: locus not found");
                        ctx.Response.Close();
                        connection.Close();

                        return;
                    }

                    results = new List<string>();
                    while (result.Read())
                    {
                        string locusA = result.GetString("locusA");
                        string locusB = result.GetString("locusB");

                        if (locusA.Equals(prot))
                            results.Add(locusB);
                        else
                            results.Add(locusA);
                    }

                    // Gera a string para as interações
                    interactions = "";
                    for (int i = 0; i < results.Count; i++)
                    {
                        if (i == 0)
                            interactions += results[i];
                        else
                            interactions += "," + results[i];
                    }

                    result.Close();
                    command.Dispose();

                    // Salva o cache para a busca feita
                    command = new MySqlCommand("INSERT INTO interaction_cache VALUES(@prot, @interactions)", connection);
                    command.Parameters.AddWithValue("@prot", prot);
                    command.Parameters.AddWithValue("@interactions", interactions);
                    command.ExecuteNonQuery();
                    command.Dispose();
                }

                // Se não, lê do cache
                else
                {
                    result.Read();
                    interactions = result.GetString("interactions");
                }

                result.Close();
                command.Dispose();

                if (string.IsNullOrWhiteSpace(interactions))
                    interactions = "(none)";

                Console.WriteLine("Resposta enviada para " + ctx.Request.RemoteEndPoint);

                using (StreamWriter writer = new StreamWriter(ctx.Response.OutputStream))
                    writer.Write(interactions);
            }
            else
            {
                Console.WriteLine("Falha na conexão com o banco de dados");
            }

            ctx.Response.Close();
            connection.Close();
        }
    }
}
