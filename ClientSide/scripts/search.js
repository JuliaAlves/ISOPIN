var __server__;

// Envia uma requisição para o servidor
function doRequest(query, onsuccess, onerror)
{
	var ajaxSettings = {
		method: "POST",

		data: query,
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

// Requisita um locus para o servidor
function requestLocus(locus, onsuccess, onerror)
{
	doRequest("LOCUS " + locus, onsuccess, onerror);
}

// Requisita um nome de proteína aleatório
function requestRandom(onsuccess, onerror)
{
	doRequest("RANDOM", onsuccess, onerror);
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
		function(data, textStatus, xhr)
		{
			var endTime = new Date().getTime();
			status.text("Pesquisa terminada em " + (endTime - startTime) / 1000 + " segundos");

			out.text("");

			var str = data;

			if (xhr.status == 200)
			{
				if (str == undefined)
				{
					status.text("Nenhuma interação encontrada para a proteína especificada");
					return;
				}

				var result = str.split(",");
				for (var i = 0; i < result.length; i++) {
					out.append(
						"<li class='list-group-item'><a href='?locus=" + result[i] + "'>" +
						result[i]+"</a></li>"
					);
				}
			}
			else if (xhr.status == 204)
			{
				status.text("O locus especificado não existe no banco de dados");

				if (sessionStorage.disableHint == "true")
				{
					$("#hint").css({display: "block"});
					$("body").css({paddingBottom: "60px"});

					requestRandom(function(data) {
						$("#hint-locus").text(data);
						$("#hint-locus").attr("href", "?locus=" + data);
					});

					sessionStorage.disableHint = false;
				}
			}
		},

		// Callback de erro
		function(xhr, ajaxOptions, thrownError)
		{
			out.text("");

			switch (xhr.status)
			{
				case 500:
					status.text("O servidor apresentou erros internos. Consulte o administrador do sistema para mais informações.");
					break;
				case 503:
					status.text("O banco de dados se encontra indisponível. Tente novamente mais tarde.");
					break;
				case 400:
					if (thrownError == "Empty locus name")
					{
						status.text("O nome do locus estava vazio");
						break;
					}
				default:
					status.text("Falha ao conectar ao servidor: " + thrownError);
			}
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
