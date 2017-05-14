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
                    Task.Run(() =>
                    {
                        Request r = new Request(ctx);

                        try
                        {
                            ProcessRequest(r);
                        } catch {
                            r.Respond("500 Internal Server Error", HttpStatusCode.InternalServerError);
                        }

                        if (r.IsOpen)
                            r.Respond("");
                    });
                }
            });
        }

        /// <summary>
        /// Processa uma requisição
        /// </summary>
        /// <param name="request">Requisição recebida pelo servidor</param>
        private static void ProcessRequest(Request request)
        {
            if (!request.IsOpen)
                return;

            if (request.Code == Request.RequestCode.Random)
                Console.WriteLine("{0} requisitou um locus aleatório", request.RemoteEndPoint);
            else
            {
                if (string.IsNullOrEmpty(request.Protein))
                {
                    request.Respond("Empty locus name", HttpStatusCode.BadRequest);
                    return;
                }

                Console.WriteLine("{0} requisitou as interações para `{1}'", request.RemoteEndPoint, request.Protein);
            }
            
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
                Console.WriteLine("Falha na conexão com o banco de dados: {0}", e.Message);

                request.Respond("503 Service Unavailable", HttpStatusCode.ServiceUnavailable);
                return;
            }

            // Verifica se a conexão está aberta
            if (connection.State == ConnectionState.Open)
            {
                MySqlCommand command;
                MySqlDataReader result;

                // Se o nome do locus for 'random', retorna o nome de um locus aleatório
                if (request.Code == Request.RequestCode.Random)
                {
                    command = new MySqlCommand("SELECT locusA FROM interactome ORDER BY RAND() LIMIT 1", connection);
                    result = command.ExecuteReader();

                    if (result.HasRows)
                    {
                        result.Read();
                        request.Respond(result.GetString(0));

                        Console.WriteLine("Resposta enviada para {0}", request.RemoteEndPoint);

                        return;
                    }
                }

                // Verifica se existe cache para esta busca
                command = new MySqlCommand("SELECT interactions FROM interaction_cache WHERE locus=@prot", connection);
                command.Parameters.AddWithValue("@prot", request.Protein);

                result = command.ExecuteReader();

                List<string> results;
                string interactions;

                // Se não houver cache, executa a consulta completa e armazena o cache
                if (!result.HasRows)
                {
                    result.Close();
                    command.Dispose();

                    // Seleciona todas as interações onde o locus procurado esteja como locusA ou locusB
                    command = new MySqlCommand("SELECT locusA, locusB FROM interactome WHERE locusA=@prot or locusB=@prot", connection);
                    command.Parameters.AddWithValue("@prot", request.Protein);
                    result = command.ExecuteReader();

                    // Se não achou nenhuma entrada com aquela proteína, ela não existe
                    if (!result.HasRows)
                    {
                        result.Close();

                        Console.WriteLine("O locus requisitado por {0} não foi encontrado no banco de dados", request.RemoteEndPoint);

                        request.Respond("", HttpStatusCode.NoContent);
                        connection.Close();

                        return;
                    }

                    results = new List<string>();
                    while (result.Read())
                    {
                        string locusA = result.GetString("locusA");
                        string locusB = result.GetString("locusB");

                        if (locusA.Equals(request.Protein))
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
                    command.Parameters.AddWithValue("@prot", request.Protein);
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

                if (!string.IsNullOrWhiteSpace(interactions))
                    request.Respond(interactions);

                Console.WriteLine("Resposta enviada para {0}", request.RemoteEndPoint);
            }
            else
            {
                Console.WriteLine("Falha na conexão com o banco de dados");
            }

            connection.Close();
        }
    }
}
