using System.Collections.Generic;
using System.Data;
using System.Net;
using MySql.Data.MySqlClient;
using System.Threading.Tasks;
using System.IO;
using ServerSide.Properties;
using System;
using System.Reflection;

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
            listener.Start();

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

            Console.WriteLine(prot);

            // Define a string de conexão
            MySqlConnection connection;
            Assembly assembly = Assembly.GetCallingAssembly();
            using (StreamReader reader = new StreamReader(assembly.GetManifestResourceStream("ServerSide.db.dat")))
                connection = new MySqlConnection(reader.ReadToEnd());

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
                ctx.Response.OutputStream.Close();
                return;
            }

            // Verifica se a conexão está aberta
            if (connection.State == ConnectionState.Open)
            {
                // Verifica se existe cache para esta busca
                // TODO: Fazer cache local
                MySqlCommand command = new MySqlCommand("SELECT interactions FROM cache WHERE locus= @prot", connection);
                command.Parameters.AddWithValue("@prot", prot);

                MySqlDataReader result = command.ExecuteReader();

                List<string> results;
                string interactions;

                if (!result.HasRows)
                {
                    command.Dispose();
                    command = new MySqlCommand("SELECT locusA, locusB FROM interactome WHERE locusA=@prot or locusB=@prot", connection);
                    command.Parameters.AddWithValue("@prot", prot);
                    result = command.ExecuteReader();

                    results = new List<string>();

                    while (result.NextResult())
                    {
                        string locusA = result.GetString("locusA");
                        string locusB = result.GetString("locusB");

                        if (locusA.Equals(prot))
                            results.Add(locusB);
                        else
                            results.Add(locusA);
                    }

                    // Salva o cache para a busca feita
                    interactions = "";

                    for (int i = 0; i < results.Count; i++)
                    {
                        if (i == 0)
                            interactions += results[i];
                        else
                            interactions += "," + results[i];
                    }

                    command.Dispose();
                    command = new MySqlCommand("INSERT INTO cache VALUES(@prot, @interactions)", connection);
                    command.Parameters.AddWithValue("@prot", prot);
                    command.Parameters.AddWithValue("@interactions", interactions);
                    command.ExecuteNonQuery();
                    command.Dispose();
                }
                else
                {
                    result.NextResult();
                    interactions = result.GetString("interactions");
                }

                using (StreamWriter writer = new StreamWriter(ctx.Response.OutputStream))
                    writer.Write(interactions);
                ctx.Response.OutputStream.Close();
                command.Dispose();
            }
            else
            {
                Console.WriteLine("Falha na conexão com o banco de dados");
            }

            connection.Close();
        }

    }
}
