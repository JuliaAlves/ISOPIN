using System;
using System.IO;
using System.Net;

namespace ATPIN
{
    /// <summary>
    /// Classe para as requisições recebidas pelo servidor
    /// </summary>
    sealed class Request
    {
        readonly HttpListenerContext _ctx;

        /// <summary>
        /// Enumerador de códigos de tipo de requisição
        /// </summary>
        public enum RequestMethod
        {
            SearchByName,
            Info,
            Random,
            SearchByC3,
            SearchByDescription,
            SearchByMethod,
            QueryC3,
            QueryDescription,
            QueryMethod
        }

        /// <summary>
        /// Código do tipo de requisição
        /// </summary>
        public RequestMethod Method { get; private set; }

        /// <summary>
        /// Booleano que indica se a requisição é válida
        /// </summary>
        /// <value><c>true</c> se for válida, <c>false</c> se não.</value>
        public bool IsOpen { get; private set; }

        /// <summary>
        /// Proteína requisitada
        /// </summary>
        /// <value>Nome da proteína cujas interações foram requisitadas</value>
        public string ProteinA { get; private set; }

        /// <summary>
        /// Proteína que interage com a requisitada
        /// </summary>
        /// <value>Nome da proteína cujas interações foram requisitadas</value>
        public string ProteinB { get; private set; }

        /// <summary>
        /// Número da página do resultado requisitada
        /// </summary>
        /// <value>Número da página da pesquisa feita pelo usuário a ser devolvida</value>
        public uint PageNumber { get; private set; }

        /// <summary>
        /// Pesquisa a ser feita
        /// </summary>
        public string SearchQuery { get; private set; }

        /// <summary>
        /// Determina se está pedindo a quantidade de páginas para uma pesquisa
        /// </summary>
        public bool RequestingPageCount { get; private set; }

        /// <summary>
        /// Obtém o ponto remoto do cliente
        /// </summary>
        /// <value>Ponto remoto do cliente</value>
        public EndPoint RemoteEndPoint => _ctx.Request.RemoteEndPoint;

        /// <summary>
        /// Construtor
        /// </summary>
        /// <param name="ctx">Contexto de HTTP recebido pelo listener do servidor</param>
        public Request(HttpListenerContext ctx)
        {
            IsOpen = true;

            _ctx = ctx;
            _ctx.Response.AppendHeader("Access-Control-Allow-Origin", "*");

            // Só responde requisições feitas por POST ou GET
            try
            {
                if (_ctx.Request.HttpMethod.Equals("POST"))
                    ParsePOSTData();
                else if (_ctx.Request.HttpMethod.Equals("GET"))
                    ParseGETData();
                else
                    Respond("405 Method Not Allowed", HttpStatusCode.MethodNotAllowed);
            } catch (BadRequestException) {
                Respond("400 Bad Request", HttpStatusCode.BadRequest);
            }
        }

		/// <summary>
		/// Processa os dados da requisição se ela usar POST
		/// </summary>
		private void ParsePOSTData()
		{
			string command;
			using (StreamReader reader = new StreamReader(_ctx.Request.InputStream))
				command = reader.ReadToEnd().Trim();

			string[] parts = command.Split(' ');

            Console.WriteLine(command);
            try {
				if (string.Compare("locus", parts[0], true) == 0)
				{
					Method = RequestMethod.SearchByName;

                    if (parts[1].Equals("PageCount", StringComparison.InvariantCultureIgnoreCase))
                        RequestingPageCount = true;
                    else
                        PageNumber = uint.Parse(parts[1]);

					ProteinA = parts[2];

					if (parts.Length > 3)
						throw new BadRequestException("Wrong number of arguments for method `LOCUS'");
				}
                else if (string.Compare("info", parts[0], true) == 0)
                {
                    Method = RequestMethod.Info;
                    ProteinA = parts[1];
                    ProteinB = parts[2];

                    if (parts.Length > 3)
                        throw new BadRequestException("Wrong number of arguments for method `INFO'");
                }
                else if (string.Compare("random", parts[0], true) == 0)
				{
					Method = RequestMethod.Random;

					if (parts.Length > 1)
						throw new BadRequestException("Wrong number of arguments for method `RANDOM'");
				}
                else if (string.Compare("qc3", parts[0], true) == 0)
                {
                    Method = RequestMethod.SearchByC3;

                    if (parts[1].Equals("PageCount", StringComparison.InvariantCultureIgnoreCase))
                        RequestingPageCount = true;
                    else
                        PageNumber = uint.Parse(parts[1]);

                    SearchQuery = command.Substring(command.IndexOf(' ', command.IndexOf(' ') + 1) + 1);
                }
                else if (string.Compare("qdesc", parts[0], true) == 0)
                {
                    Method = RequestMethod.SearchByDescription;

                    if (parts[1].Equals("PageCount", StringComparison.InvariantCultureIgnoreCase))
                        RequestingPageCount = true;
                    else
                        PageNumber = uint.Parse(parts[1]);

                    SearchQuery = command.Substring(command.IndexOf(' ', command.IndexOf(' ') + 1) + 1);
                }
                else if (string.Compare("qm", parts[0], true) == 0)
                {
                    Method = RequestMethod.SearchByMethod;

                    if (parts[1].Equals("PageCount", StringComparison.InvariantCultureIgnoreCase))
                        RequestingPageCount = true;
                    else
                        PageNumber = uint.Parse(parts[1]);

                    SearchQuery = command.Substring(command.IndexOf(' ', command.IndexOf(' ') + 1) + 1);
                }
                else if (string.Compare("c3", parts[0], true) == 0)
                {
                    Method = RequestMethod.QueryC3;
                    ProteinA = parts[1];
                    ProteinB = parts[2];

                    if (parts.Length > 3)
                        throw new BadRequestException("Wrong number of arguments for method `C3'");
                }
                else if (string.Compare("desc", parts[0], true) == 0)
                {
                    Method = RequestMethod.QueryDescription;
                    ProteinA = parts[1];

                    if (parts.Length > 2)
                        throw new BadRequestException("Wrong number of arguments for method `DESC'");
                }
                else if (string.Compare("m", parts[0], true) == 0)
                {
                    Method = RequestMethod.QueryMethod;
                    ProteinA = parts[1];
                    ProteinB = parts[2];

                    if (parts.Length > 3)
                        throw new BadRequestException("Wrong number of arguments for method `M'");
                }
                else
                    throw new BadRequestException("Unknown method");
			}
			catch (Exception e)
			{
                if (e.GetType() == typeof(BadRequestException))
                    throw e;

                throw new BadRequestException("Unknown error", e);
			}
		}

        /// <summary>
        /// Processa os dados da requisição se ela usar GET
        /// </summary>
        private void ParseGETData()
        {
            ProteinA = _ctx.Request.QueryString["locus"];
            ProteinB = _ctx.Request.QueryString["info"];
            if (_ctx.Request.QueryString["page"] != null)
                try
                {
                    PageNumber = uint.Parse(_ctx.Request.QueryString["page"]);
                }
                catch
                {
                    throw new BadRequestException("Invalid page number");
                }
            
            if (!string.IsNullOrEmpty(ProteinA))
            {
                if (!string.IsNullOrEmpty(ProteinB))
                {
                    Method = RequestMethod.Info;
                    ProteinB = Uri.UnescapeDataString(ProteinB);
                }
                else
                    Method = RequestMethod.SearchByName;

                ProteinA = Uri.UnescapeDataString(ProteinA);
            }
            else if (string.Compare(_ctx.Request.QueryString[null], "random", true) == 0)
            {
                Method = RequestMethod.Random;
            }
            else if (_ctx.Request.QueryString["qc3"] != null)
            {
                Method = RequestMethod.SearchByC3;
                SearchQuery = _ctx.Request.QueryString["qc3"];
                Console.Write(SearchQuery);
            }
            else if (_ctx.Request.QueryString["qdesc"] != null)
            {
                Method = RequestMethod.SearchByDescription;
                SearchQuery = _ctx.Request.QueryString["qdesc"];
            }
            else if (_ctx.Request.QueryString["qm"] != null)
            {
                Method = RequestMethod.SearchByMethod;
                SearchQuery = _ctx.Request.QueryString["qm"];
            }
            else if (_ctx.Request.QueryString["c3"] != null)
            {
                Method = RequestMethod.QueryC3;
                ProteinA = _ctx.Request.QueryString["c3"].Split(',')[0];
                ProteinB = _ctx.Request.QueryString["c3"].Split(',')[1];
                Console.Write(SearchQuery);
            }
            else if (_ctx.Request.QueryString["desc"] != null)
            {
                Method = RequestMethod.QueryDescription;
                ProteinA = _ctx.Request.QueryString["desc"];
            }
            else if (_ctx.Request.QueryString["m"] != null)
            {
                Method = RequestMethod.QueryMethod;
                ProteinA = _ctx.Request.QueryString["m"].Split(',')[0];
                ProteinB = _ctx.Request.QueryString["m"].Split(',')[1];
            }
            else
                throw new BadRequestException("Unknown method");
        }

        /// <summary>
        /// Responde a requisição e fecha a conexão
        /// </summary>
        /// <param name="response">Resposta a ser enviada para o cliente</param>
        public void Respond(string response, HttpStatusCode statusCode = HttpStatusCode.OK)
        {
            _ctx.Response.StatusCode = (int)statusCode;

			using (StreamWriter writer = new StreamWriter(_ctx.Response.OutputStream))
				writer.Write(response);
			_ctx.Response.Close();

            IsOpen = false;
        }
    }
}
