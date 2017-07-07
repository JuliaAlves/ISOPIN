using System.IO;
using System.ServiceProcess;

namespace ATPIN
{
    /// <summary>
    /// Classe principal do versão de serviço do programa
    /// </summary>
    class ServiceProgram
    {
        /// <summary>
        /// Classe para controle dos argumentos de linha de comando
        /// </summary>
        class CommandLineOptions
        {
            /// <summary>
            /// Opção de saída do log
            /// </summary>
            [CommandLine.Option('o', "out", DefaultValue = null, HelpText = "Arquivo para onde redirecionar o log do servidor")]
            public string OutputFile { get; set; }

            [CommandLine.ParserState]
            public CommandLine.IParserState LastParserState { get; set; }

            [CommandLine.HelpOption]
            public string GetUsage()
            {
                return CommandLine.Text.HelpText.AutoBuild(this,
                  (CommandLine.Text.HelpText current) => CommandLine.Text.HelpText.DefaultParsingErrorsHandler(this, current));
            }
        }

        /// <summary>
        /// Ponto de entrada
        /// </summary>
        /// <param name="args">Argumentos da linha de comando</param>
        public static void Main(string[] args)
        {
            Commons.Output = null;

            // Processamento dos argumentos da linha de comando
            CommandLineOptions options = new CommandLineOptions();

            if (CommandLine.Parser.Default.ParseArguments(args, options) && options.OutputFile != null)
                Commons.Output = new StreamWriter(options.OutputFile);

            ServiceBase.Run(new AtpinService());
        }
    }
}
