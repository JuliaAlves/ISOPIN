using ATPIN.Properties;

using System;
using System.Diagnostics;
using System.IO;
using System.Net;
using System.Threading.Tasks;

namespace ATPIN
{
    /// <summary>
    /// Classe com as funções usadas tanto pela versão console quanto pela versão Daemon do
    /// programa
    /// </summary>
    public class Commons
    {
        private static HttpListener listener;

        /// <summary>
        /// TextWriter onde será escrito o log do servidor. Inicialmente aponta para a saída padrão do Console.
        /// </summary>
        public static TextWriter Output { get; set; } = Console.Out;

        /// <summary>
        /// Executa o servidor
        /// </summary>
        /// <returns>Uma Task que corresponde à thread do tratamento do servidor</returns>
        public static Task RunHttpServerAsync()
        {
            if (listener?.IsListening ?? false)
                throw new Exception("O servidor já está sendo executado");

            // Inicializa o servidor Http na porta configurada
            listener = new HttpListener();

            listener.Prefixes.Add(string.Format("http://*:{0}/", Settings.Default.Port));

            try
            {
                listener.Start();

                Log("Servidor HTTP inicializado com sucesso em http://*:/{0}/", Settings.Default.Port);
            }
            catch (Exception e)
            {
                listener = new HttpListener();
                listener.Prefixes.Add(string.Format("http://localhost:{0}/", Settings.Default.Port));

                Log("Falha ao inicializar o servidor em http://*:/{0}/: {1}. O servidor será inicializado localmente", Settings.Default.Port, e.Message);

                try
                {
                    listener.Start();
                    Log("Servidor HTTP inicializado com sucesso em http://localhost:{0}/", Settings.Default.Port);
                }
                catch
                {
                    Log("Falha ao inicializar o servidor localmente: {0}", e.Message);
                    return null;
                }
            }

            // Roda uma thread que responde as requisições feitas ao servidor
            return RespondRequestsAsync();
        }

        /// <summary>
        /// Para a execução do servidor HTTP
        /// </summary>
        public static void StopHttpServer()
        {
            listener.Stop();
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
                    try
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
                                }
                                catch (Exception e)
                                {
                                    Log("Erro inesperado: {0}", e.Message);
                                    r.Respond("500 Internal Server Error", HttpStatusCode.InternalServerError);
                                }
                        });
                    }
                    catch (Exception e)
                    {
                        if (e is InvalidOperationException || e is ObjectDisposedException)
                            Log("Servidor fechado");
                        else
                            Log("Erro inesperado: {0}", e.Message);
                    }
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
            Output?.WriteLine(
                "[{0} {1}] {2}",
                DateTime.Now.ToShortDateString(),
                DateTime.Now.ToLongTimeString(),
                string.Format(format, parameters)
            );
            Output?.Flush();
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
                            db.Close();
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
                            db.Close();
                            return;
                        }

                        Log("{0} requisitou as informações para a interação `{1}' -> `{2}'", request.RemoteEndPoint, request.ProteinA, request.ProteinB);

                        try
                        {
                            request.Respond(db.GetInfoForInteraction(request.ProteinA, request.ProteinB));
                        }
                        catch (InfoForInteractomeNotFoundException)
                        {
                            Log("Informações não encontradas para a requisição feita por {0}", request.RemoteEndPoint);
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
