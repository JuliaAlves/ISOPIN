namespace ATPIN
{
    /// <summary>
    /// Classe para o programa console
    /// </summary>
    class ConsoleProgram
    {
        /// <summary>
        /// Ponto de entrada do console
        /// </summary>
        /// <param name="args">Argumentos da linha de comando</param>
        static void Main(string[] args)
        {
            Commons.RunHttpServerAsync()?.Wait();
        }
    }
}
