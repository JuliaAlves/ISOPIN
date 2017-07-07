using System;
using System.ServiceProcess;

namespace ATPIN
{
    /// <summary>
    /// Classe principal da versão de serviço do programa
    /// </summary>
    partial class AtpinService : ServiceBase
    {
        /// <summary>
        /// Construtor
        /// </summary>
        public AtpinService()
        {
            InitializeComponent();
        }

        /// <summary>
        /// Inicialização do serviço
        /// </summary>
        /// <param name="args">Argumentos da linha de comando</param>
        protected override void OnStart(string[] args)
        {
            EventLog.WriteEntry("Iniciou");
            try
            {
                Commons.RunHttpServerAsync();
            }
            catch (Exception e)
            {
                EventLog.WriteEntry("Falhou: " + e.Message);
            }
        }

        /// <summary>
        /// Finalização do serviço
        /// </summary>
        protected override void OnStop()
        {
            Commons.StopHttpServer();
        }
    }
}
