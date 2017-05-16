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

            try
            {
                listener.Start();
            }
            catch (Exception e)
            {
                Log("Falha ao inicializar o servidor: {0}", e.Message);
                return;
            }

            Log("Servidor HTTP inicializado com sucesso na porta {0}", Settings.Default.Port);

            // Roda uma thread que responde as requisições feitas ao servidor
            Task task = RespondRequestsAsync();
            task.Wait();
        }

        /// <summary>
        /// Responde requisições ao sistema de forma asíncrona
        /// </summary>
         static Task RespondRequestsAsync()
        {
            return Task.Run(() =>
            {
                while (listener.IsListening)
                {
                    HttpListenerContext ctx = listener.GetContext();
                    Task.Run(() =>
                    {
                        Request r = new Request(ctx);

                        if (r.IsOpen) 
                            try
	                        {
	                            ProcessRequest(r);

								if (r.IsOpen)
									r.Respond("");
	                        } catch (Exception e) {
                                Log("Erro inesperado: {0} ", e.Message);
	                            r.Respond("500 Internal Server Error", HttpStatusCode.InternalServerError);
	                        }
                    });
                }
            });
        }

		/// <summary>
		/// Escreve um log para a saída padrão
		/// </summary>
		/// <param name="format">Formato a ser escrito</param>
		/// <param name="parameters">Parâmetros para o formato</param>
		static void Log(string format, params object[] parameters)
		{
            Console.WriteLine(
                "[{0}, {1}] {2}",
                DateTime.Now.ToLongDateString(),
                DateTime.Now.ToLongTimeString(), 
                string.Format(format, parameters)
            );
		}

        /// <summary>
        /// Processa uma requisição
        /// </summary>
        /// <param name="request">Requisição recebida pelo servidor</param>
        static void ProcessRequest(Request request)
        {
            Database db;

			// Abre a conexão
			try
			{
				db = Database.Connect();
			}
			catch (Exception e)
			{
				Log("Falha na conexão com o banco de dados: {0}", e.Message);

				request.Respond("503 Service Unavailable", HttpStatusCode.ServiceUnavailable);
				return;
			}

			if (db.Connected)
			{
                switch (request.Method)
                {
                    case Request.RequestMethod.Random:
                        Log("{0} requisitou uma proteína aleatória", request.RemoteEndPoint);
                        request.Respond(db.GetRandom());
                        break;

                    case Request.RequestMethod.Specific:
                        
						if (string.IsNullOrEmpty(request.ProteinA))
						{
							request.Respond("Empty locus name", HttpStatusCode.BadRequest);
							return;
						}

                        Log("{0} requisitou as interações para `{1}'", request.RemoteEndPoint, request.ProteinA);

                        try
                        {
                            string interactions = db.GetInteractionsForProtein(request.ProteinA);

                            if (!string.IsNullOrWhiteSpace(interactions))
                                request.Respond(interactions);
                        } 
                        catch (LocusNotFoundException)
                        {
							Log("O locus requisitado por {0} não foi encontrado no banco de dados", request.RemoteEndPoint);
							request.Respond("", HttpStatusCode.NoContent);
                        }
						
                        break;

                    case Request.RequestMethod.Info:
                        if (string.IsNullOrEmpty(request.ProteinA) || string.IsNullOrEmpty(request.ProteinB))
                        {
                            request.Respond("Empty locus name", HttpStatusCode.BadRequest);
                            return;
                        }

                        Log("{0} requisitou as informação para a interação `{1}' -> `{2}'", request.RemoteEndPoint, request.ProteinA, request.ProteinB);

                        try
                        {
                            request.Respond(db.GetInfoForInteraction(request.ProteinA, request.ProteinB));
                        }
                        catch (LocusNotFoundException)
                        {
                            Log("Informação não encontrada para a requisição feita por {0}", request.RemoteEndPoint);
                            request.Respond("", HttpStatusCode.NoContent);
                        }
                        break;
                }

                Log("Resposta enviada para {0}", request.RemoteEndPoint);
            }
            else
                Log("Falha na conexão com o banco de dados");

            db.Close();
        }
    }
}
