using System;
using System.Collections.Generic;
using System.IO;
using System.Reflection;
using System.Text.RegularExpressions;
using MySql.Data.MySqlClient;
using System.Globalization;

namespace ServerSide
{
    /// <summary>
    /// Classe para interação com o banco de dados
    /// </summary>
    sealed class Database
    {
        MySqlConnection _conn;

        /// <summary>
        /// Construtor privado
        /// </summary>
        private Database() {}

        /// <summary>
        /// Verifica se está conectado ao banco de dados
        /// </summary>
        /// <value><c>true</c> se estiver, <c>false</c> caso contrário.</value>
        public bool Connected => _conn.State == System.Data.ConnectionState.Open;

        /// <summary>
        /// Obtém a string de conexão para o BD
        /// </summary>
        /// <returns>The connection string.</returns>
        private static string GetConnectionString()
        {
            string str;
			Assembly assembly = Assembly.GetCallingAssembly();
            using (StreamReader r = new StreamReader(assembly.GetManifestResourceStream("ServerSide.db.dat")))
                str = r.ReadToEnd();

            return str;
        }

        /// <summary>
        /// Conecta com o banco de dados e retorna uma instância dele
        /// </summary>
        public static Database Connect()
        {
            Database db = new Database()
            {
                _conn = new MySqlConnection(GetConnectionString())
	        };
            db._conn.Open();

            return db;
        }

		/// <summary>
		/// Executa um SELECT no banco de dados
		/// </summary>
		/// <param name="sqlQuery">SELECT a ser executado.</param>
        /// <param name="parameters">Parâmetros para o SELECT</param>
		/// <returns>O resultado do SELECT</returns>
        private MySqlDataReader ExecuteQuery(string sqlQuery, params object[] parameters)
        {
            using (MySqlCommand command = new MySqlCommand(sqlQuery, _conn))
            {
                for (int i = 0; i < parameters?.Length; i++)
                        command.Parameters.AddWithValue("@" + i, parameters[i]);

                return command.ExecuteReader();
            }
        }

        /// <summary>
        /// Obtém um nome de proteína aleatória
        /// </summary>
        /// <returns>O nome de uma proteína qualquer existente no banco de dados</returns>
        public string GetRandom()
        {
            string prot = "",
                    query = "SELECT locusA FROM interactome ORDER BY RAND() LIMIT 1";

            using (MySqlDataReader result = ExecuteQuery(query))
            {
                if (result.HasRows)
                {
                    result.Read();
                    prot = result.GetString("locusA");
                }
            }

            return prot;
        }

        /// <summary>
        /// Obtém as informações para um interactoma onde a proteína A é a pesquisada e a B
        /// é a que interage com ela
        /// </summary>
        /// <param name="protA">Proteína A da interação</param>
        /// <param name="protB">Proteína B da interação</param>
        /// <returns>Dados em formato JSON para a interação</returns>
        public string GetInfoForInteraction(string protA, string protB)
        {
            string query = "SELECT i.locusA, i.locusB, i.exp, i.local, t.desc, f.fsw FROM interactome i " +
                           "INNER JOIN tair t ON t.locus = @1 " +
                           "INNER JOIN fsw f ON f.ppid = i.ppid " +
                           "WHERE(i.locusA = @0 AND i.locusB = @1) OR (i.locusB = @0 AND i.locusA = @1) LIMIT 1";

            string json = "{";

            using (MySqlDataReader result = ExecuteQuery(query, protA, protB))
            {
                if (!result.Read())
                    throw new InfoForInteractomeNotFoundException();

                // FSW
                json += string.Format("\"fsw\": {0}, ", result.GetDecimal("fsw").ToString(CultureInfo.InvariantCulture.NumberFormat));
                
                // Método experimental usado
                json += "\"method\": [";

                string[] exp = result.GetString("exp").Split('|');
                for (int i = 0; i < exp.Length; i++)
                {
                    json += string.Format("\"{0}\"", exp[i]);

                    if (i < exp.Length - 1)
                        json += ",";
                }
                json += "], ";

                // Descrição da proteína
                json += string.Format("\"description\": \"{0}\", ", Regex.Unescape(result.GetString("desc")));

                // Locais de interação
                json += "\"local\": ";

                string[] l = result.GetString("local").Split(',');

                if (string.IsNullOrEmpty(l[0]))
                    json += "undefined";
                else
                {
                    for (int i = 0; i < l.Length; i++)
                    {
                        json += string.Format("\"{0}\"", l[i]);

                        if (i < l.Length - 1)
                            json += ",";
                    }

                    json += "]";
                }
            }

            return json + "}";
        }

        /// <summary>
        /// Obtém as interações para uma proteína
        /// </summary>
        /// <param name="prot">A proteína cujas interações se quer</param>
        /// <returns>As interações para a proteína especificada em uma string separada por vírgulas</returns>
        public string GetInteractionsForProtein(string prot)
        {
            // Se existe cache, retorna ele
            string cache = GetCache(prot);
            if (cache != null)
                return cache;

            // Se não, faz a pesquisa e armazena o cache
            string interactions = "",
                    query = "SELECT locusA, locusB FROM interactome WHERE locusA=@0 or locusB=@0";

            List<string> results = new List<string>();

            using (MySqlDataReader result = ExecuteQuery(query, prot))
            {
                if (!result.HasRows)
                    throw new LocusNotFoundException();

                while (result.Read())
                {
					string locusA = result.GetString("locusA");

                    results.Add(locusA.Equals(prot) ? result.GetString("locusB") : locusA);
                }
            }

            foreach (string interactome in results)
                interactions += interactome + ",";
            interactions = interactions.TrimEnd(',');

            SaveCache(prot, interactions);

            return interactions;
        }

        /// <summary>
        /// Salva o cache para as interações de uma proteína
        /// </summary>
        /// <param name="prot">Proteína</param>
        /// <param name="interactions">Interações em forma de string separada por vírgulas</param>
        private void SaveCache(string prot, string interactions)
        {
            string sql = "INSERT INTO interaction_cache VALUES(@prot, @interactions)";

            var command = new MySqlCommand(sql, _conn);
			command.Parameters.AddWithValue("@prot", prot);
			command.Parameters.AddWithValue("@interactions", interactions);
			command.ExecuteNonQuery();
			command.Dispose();
        }

        /// <summary>
        /// Obtém o cache para as interações de uma proteína
        /// </summary>
        /// <returns>O cache ou nulo caso não exista</returns>
        /// <param name="prot">A proteína para a qual buscar o cache</param>
        private string GetCache(string prot)
        {
            string interactions = null, 
                    query = "SELECT interactions FROM interaction_cache WHERE locus=@0";

            using (MySqlDataReader result = ExecuteQuery(query, prot))
            {
                if (result.HasRows)
                {
                    result.Read();
                    interactions = result.GetString("interactions");
                }
            }

            return interactions;
        }

        /// <summary>
        /// Fecha a conexão com o banco de dados
        /// </summary>
        public void Close()
        {
            _conn.Close();
        }
    }
}
