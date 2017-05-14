﻿using System;
namespace ServerSide
{
    /// <summary>
    /// Exceção disparada quando um locus não é encontrado no banco de dados
    /// </summary>
    public class LocusNotFoundException : Exception {}

    /// <summary>
    /// Exceção disparada quando uma requisição é determinada inválida
    /// </summary>
    public class BadRequestException : Exception {
        
        /// <summary>
        /// Construtor
        /// </summary>
        public BadRequestException() {}

        /// <summary>
        /// Construtor
        /// </summary>
        /// <param name="message">Mensagem da exceção</param>
        public BadRequestException(string message) : base(message) {}

		/// <summary>
		/// Construtor
		/// </summary>
		/// <param name="message">Mensagem da exceção</param>
        /// <param name="inner">Exceção que levou a esta</param>
        public BadRequestException(string message, Exception inner) : base(message, inner) { }
    }
}
