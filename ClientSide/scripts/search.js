var __server__;

// Envia uma requisição para o servidor
function sendRequest(query, onsuccess, onerror)
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

// Callback de erro
function erro(xhr, ajaxOptions, thrownError)
{
    var out = $("#resultado");
    var status = $("#status");
    out.text("");

    if (xhr.readyState == 0)
        status.text("Servidor indisponível. Tente novamente mais tarde.");
    else
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

// Requisita um locus para o servidor
function requestLocus(locus, onsuccess, onerror)
{
	sendRequest("LOCUS " + locus, onsuccess, onerror);
}

// Requisita informações de um interactoma para o servidor
function requestInfo(locusA, locusB, onsuccess, onerror)
{
	sendRequest("INFO " + locusA + " " + locusB, onsuccess, onerror);
}

// Requisita um nome de proteína aleatório
function requestRandom(onsuccess, onerror)
{
	sendRequest("RANDOM", onsuccess, onerror);
}

// Evento de edição do input de pesquisa
function pesquisaEdited()
{
    var input = $("#proteina");
    var submit = $("#submit");
    var locus = input.val().trim();

    if (!input[0].checkValidity())
        input.parent().addClass("has-error");
    else
        input.parent().removeClass("has-error");

    if (locus == "")
        submit.attr("disabled", true);
    else
        submit.removeAttr("disabled");
}

// Procura um locus no banco de dados e mostra o resultado
function Procurar() {
    var out = $("#resultado");
	var status = $("#status");

    var input = $("#proteina");
    var locus = input.val().toUpperCase().trim();
    input.val(locus);

    if (!input[0].checkValidity())
    {
        out.text("");
        status.text("O nome da proteína não pode estar vazio nem conter espaços");
        return;
    }

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
						"<li class='list-group-item'><a href='?locus=" + result[i] + "' class='result-item'>" +
						result[i]+"</a>"+
                        "<span class='more glyphicon glyphicon-plus' onclick='detalhes("+i+")'></span><br><div class='target'></div></li>"
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
        
        erro
	);
}

// Mostra as informações para uma interação
function detalhes(i)
{
	var input = $("#proteina");
    var locus = input.val().toUpperCase().trim();

    var item = $(".result-item")[i];
    var div = $(item).parent().find(".target");

    if (!div.is(":visible"))
    {
    	if (div.text() == "")
	        requestInfo(locus, item.text, function(data){
	            div.text(data);
	            div.css({display: "block"});
	        },
	        erro);
	    else
	    	div.css({display: "block"});
    }
    else
        div.css({display: "none"});
}

// Procura um locus usando a query string
$(document).ready(function() {
    $("#proteina").on('input', pesquisaEdited);

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
        pesquisaEdited();
		Procurar(locus);
	}
});
