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
        private static TcpListener listener;

        /// <summary>
        /// Inicialização do console
        /// </summary>
        /// <param name="args">Argumentos da linha de comando</param>
        static void Main(string[] args)
        {
            // Inicializa o servidor Tcp na porta configurada
            listener = new TcpListener(IPAddress.Any, Settings.Default.Port);
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
                while (true)
                {
                    TcpClient cl = listener.AcceptTcpClient();
                    Task.Run(() => ProcessRequest(cl));
                }
            });
        }

        /// <summary>
        /// Processa uma requisição
        /// </summary>
        /// <param name="cl">TcpClient recebido pelo listener</param>
        private static void ProcessRequest(TcpClient cl)
        {
            StreamReader reader = new StreamReader(cl.GetStream());
            string prot = reader.ReadToEnd();

            Console.WriteLine(prot);

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

                using (StreamWriter writer = new StreamWriter(cl.GetStream()))
                    writer.Write("failed: DB offline");
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

                using (StreamWriter writer = new StreamWriter(cl.GetStream()))
                    writer.Write(interactions);
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
