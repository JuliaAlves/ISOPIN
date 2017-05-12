var __server__;

// Requisita um locus para o servidor
function requestLocus(locus, onsuccess, onerror)
{
	var ajaxSettings = {
		method: "POST",
		
		data: locus,
		dataType: "text",
		
		success: onsuccess,
		
		error: onerror
	};
	
	if (!!__server__)
		$.ajax(__server__ , ajaxSettings);
	else
		$.getJSON("server.json", function(data) {
			__server__ = "http://" + data.address + ":" + data.port;
			$.ajax(__server__ , ajaxSettings);
		});
}

// Procura um locus no banco de dados e mostra o resultado
function Procurar(locus) {
	locus = locus.trim().toUpperCase();

	var out = $("#resultado");
	var status = $("#status");
	status.text("Procurando proteína...");
	
	var startTime = new Date().getTime();

	// Configurações da requisição do AJAX
	requestLocus(
		locus,
		
		// Callback de sucesso
		function(data) 
		{
			var endTime = new Date().getTime();
			status.text("Pesquisa terminada em " + (endTime - startTime) / 1000 + " segundos");

			out.text("");
			
			var str = data;

			// Erros
			if (str == "404: locus not found")
			{
				status.text("O locus especificado não existe no banco de dados");
			}
			else if (str == "empty locus name")
			{
				status.text("O nome do locus estava vazio");
			}
			else
			{
				var result = str.split(",");
				for (var i = 0; i < result.length; i++) {
					out.append(
						"<li class='list-group-item'><a href='?locus=" + result[i] + "'>" + 
						result[i]+"</a></li>"
					);
				}
			}
		},
		
		// Callback de erro
		function(xhr, ajaxOptions, thrownError)
		{
			status.text("Falha ao conectar ao servidor: " + thrownError);
		}
	);
}

// Procura um locus usando a query string
$(document).ready(function() {
	var locus;

	var query = window.location.search.substring(1);
	var vars = query.split('&');
	for (var i = 0; i < vars.length; i++) {
	    var pair = vars[i].split('=');
	    if (decodeURIComponent(pair[0]) == 'locus') {
	        locus = decodeURIComponent(pair[1]);
	        break;
	    }
	}

	if (!!locus)
	{
		$("#proteina").val(locus);
		Procurar(locus);
	}
});