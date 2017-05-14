using System;
using System.Collections.Generic;
using System.IO;
using System.Reflection;
using MySql.Data.MySqlClient;

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
            string interactions = null,
                    query = "SELECT locusA, locusB FROM interactome WHERE locusA=@0 or locusB=@0";

            using (MySqlDataReader result = ExecuteQuery(query, prot))
            {
                if (!result.HasRows)
                    throw new LocusNotFoundException();

                List<string> results = new List<string>();
                while (result.Read())
                {
					string locusA = result.GetString("locusA");
					string locusB = result.GetString("locusB");

					if (locusA.Equals(prot))
						results.Add(locusB);
					else
						results.Add(locusA);
                }

				interactions = "";
				for (int i = 0; i < results.Count; i++)
				{
					if (i == 0)
						interactions += results[i];
					else
						interactions += "," + results[i];
				}
            }

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
