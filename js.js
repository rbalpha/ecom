alert("Hola");

var t1="¡Volvé!",t2="No te lo pierdas...",i=0;document.addEventListener("visibilitychange",function(){if(document.hidden){i=0;window.int=setInterval(function(){document.title=i++%2?t2:t1},1000)}else{clearInterval(window.int);document.title="Tienda Online de Magi"}});
let b=document.querySelector(".row-fluid"),t=b.querySelector(".font-small"),x=b.offsetWidth,s=window.innerWidth<=600?1.4:1,p=1/s,l=performance.now();t.innerHTML=Array(8).join(t.innerHTML.replace(/_/g,Array(12).join("&nbsp;")));b.style.cssText="position:relative;overflow:hidden;height:30px";t.style.cssText="position:absolute;white-space:nowrap;top:50%;transform:translateY(-50%);left:100%";(function m(n){x-=p*((n-l)/16.67);l=n;t.style.left=x+"px";if(x<-t.scrollWidth)x=b.offsetWidth;requestAnimationFrame(m)})(l);


(function() {
    window.originalFetch = window.originalFetch || window.fetch;

    // --- 1. TRATAMIENTOS DE REQUEST (Peticiones) ---
    var requestHandlers = {
        '/envio/': function(url, options) {
            var elemento = document.querySelector('.bundle-cantidad-producto.selected');
            var cantidadDinamica = elemento ? elemento.getAttribute('data-cantidad') : null;

            if (options && options.body && cantidadDinamica) {
                console.log("✅ Request Handler [/envio/]: Seteando cantidad " + cantidadDinamica);
                
                if (options.body instanceof URLSearchParams || options.body instanceof FormData) {
                    options.body.set('quantity', cantidadDinamica);
                } else if (typeof options.body === 'string') {
                    try {
                        var data = JSON.parse(options.body);
                        data.quantity = cantidadDinamica;
                        options.body = JSON.stringify(data);
                    } catch (e) { }
                }
            }
            return options;
        }
    };

    // --- 2. TRATAMIENTOS DE RESPONSE (Respuestas) ---
var responseHandlers = {
    '/envio/': function(response, url, options) {

        // --- Helpers ---
        var getCep = function(options) {
            if (!options || !options.body) return "";
            try {
                if (options.body instanceof URLSearchParams || options.body instanceof FormData) {
                    return options.body.get('cep') || "";
                } else if (typeof options.body === 'string') {
                    return new URLSearchParams(options.body).get('cep') || "";
                }
            } catch(e) {
                console.warn('[envio] No se pudo parsear options.body:', e);
            }
            return "";
        };

        var esAMBA = function(zip) {
            var num = parseInt(zip, 10);
            return (!isNaN(num) && num >= 1000 && num <= 1899);
        };

        var esMagi = function(item) {
            var dataStore = item.getAttribute('data-store') || "";
            return dataStore.indexOf('shipping-calculator-item-pickup-point') !== -1;
        };

        var getMejorItem = function(items) {
            if (!items || items.length === 0) return null;
            var gratis = items.find(function(item) {
                var cost = (item.querySelector('input').getAttribute('data-cost') || "").toLowerCase();
                return cost.indexOf('gratis') !== -1;
            });
            return gratis || items.reduce(function(prev, curr) {
                var pPrev = parseFloat(prev.querySelector('input').getAttribute('data-price')) || Infinity;
                var pCurr = parseFloat(curr.querySelector('input').getAttribute('data-price')) || Infinity;
                return pCurr < pPrev ? curr : prev;
            });
        };

        var formatCosto = function(cost) {
            return cost.trim().replace(/,00$/, '');
        };

        var getFechaDesdeDataName = function(item) {
            var dataName = item.querySelector('input').getAttribute('data-name') || "";
            var parts = dataName.split(' - ');
            return parts.length > 1 ? parts[parts.length - 1].trim() : "";
        };

        var normalizarFecha = function(textoFecha) {
            var reDate = /(\d{1,2})\/(\d{2})/g;
            var fechas = [];
            var match;
            while ((match = reDate.exec(textoFecha)) !== null) {
                fechas.push({ dia: parseInt(match[1], 10), mes: parseInt(match[2], 10) });
            }
            if (fechas.length === 0) return textoFecha;

            var ahora       = new Date();
            var hora        = ahora.getHours();
            var diaSem      = ahora.getDay();
            var esHabil     = diaSem >= 1 && diaSem <= 5;
            var superaCorte = esHabil && hora >= 13;
            var hoy         = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate());

            var toDate = function(f) {
                return new Date(ahora.getFullYear(), f.mes - 1, f.dia);
            };
            var diffDias = function(d) {
                return Math.round((d - hoy) / 86400000);
            };
            var nombreDia = function(d) {
                return ["domingo","lunes","martes","miércoles","jueves","viernes","sábado"][d.getDay()];
            };
            var labelDia = function(f) {
                var d            = toDate(f);
                var diff         = diffDias(d);
                var efectivoDiff = superaCorte ? diff - 1 : diff;
                if (efectivoDiff <= 0) return "hoy";
                if (efectivoDiff === 1) return "mañana";
                var nombre = nombreDia(d);
                if (diff <= 8) return "el " + nombre;
                return "el " + nombre + " " + f.dia + "/" + (f.mes < 10 ? "0" + f.mes : f.mes);
            };

            if (fechas.length === 1) {
                var l = labelDia(fechas[0]);
                return textoFecha
                    .replace(/el [^\d\/\s,]+ \d{1,2}\/\d{2}/, l)
                    .replace(/\d{1,2}\/\d{2}/, l);
            }
            if (fechas.length === 2) {
                var l1 = labelDia(fechas[0]);
                var l2 = labelDia(fechas[1]);
                return textoFecha.replace(
                    /entre el [^\d\/\s,]+ \d{1,2}\/\d{2} y el [^\d\/\s,]+ \d{1,2}\/\d{2}/,
                    'entre ' + l1 + ' y ' + l2
                );
            }
            return textoFecha;
        };

        var buildLiWrapper = function(item, isChecked, innerHtml) {
            var input     = item.querySelector('input');
            var label     = item.querySelector('label');
            var inputClone = input.cloneNode(true);
            if (isChecked) {
                inputClone.setAttribute('checked', 'checked');
            } else {
                inputClone.removeAttribute('checked');
            }
            return '<li class="js-shipping-list-item radio-button-item list-item" '
                 + 'data-store="' + (item.getAttribute('data-store') || '') + '">'
                 + '<label class="js-shipping-radio radio-button shipping-option" '
                 + 'data-loop="' + (label.getAttribute('data-loop') || '') + '" '
                 + 'data-shipping-type="' + (label.getAttribute('data-shipping-type') || '') + '" '
                 + 'data-component="shipping.option">'
                 + inputClone.outerHTML
                 + '<span class="row-fluid radio-button-content">'
                 + '<div class="radio-button-icons-container">'
                 + '<span class="radio-button-icons">'
                 + '<span class="radio-button-icon unchecked"></span>'
                 + '<span class="radio-button-icon checked"></span>'
                 + '</span></div>'
                 + '<span class="radio-button-label">'
                 + '<div class="row-fluid radio-button-text">'
                 + '<div class="span9 col-xs-9-custom pull-left-xs">'
                 + innerHtml
                 + '</div></div>'
                 + '</span></span>'
                 + '</label></li>';
        };

        var buildItemHtml = function(item, tipo, isChecked) {
            var input    = item.querySelector('input');
            var costRaw  = (input.getAttribute('data-cost') || "").trim();
            var esGratis = costRaw.toLowerCase().indexOf('gratis') !== -1;
            var costo    = formatCosto(costRaw);
            var textoPromesa = "";
            var innerHtml    = "";

            if (tipo === 'delivery') {
                var fechaRaw  = getFechaDesdeDataName(item);
                var fechaNorm = normalizarFecha(fechaRaw).replace(/^(llega|retiras|retirás)\s+/i, '');
                if (esGratis) {
                    textoPromesa = 'Llega <span style="color:#2ea44f;font-weight:bold;">gratis</span> ' + fechaNorm;
                } else {
                    textoPromesa = 'Llega ' + fechaNorm + ' por ' + costo;
                }
                innerHtml = '<div class="shipping-method-name m-bottom-quarter" data-component="option.name">'
                          + textoPromesa + '</div>';
            }

            else if (tipo === 'pickup-sucursal') {
                var fechaRaw2  = getFechaDesdeDataName(item);
                var fechaNorm2 = normalizarFecha(fechaRaw2).replace(/^(retiras|retirás)\s+/i, '');
                if (esGratis) {
                    textoPromesa = 'Retirás <span style="color:#2ea44f;font-weight:bold;">gratis</span> ' + fechaNorm2;
                } else {
                    textoPromesa = 'Retirás ' + fechaNorm2 + ' por ' + costo;
                }
                // Preservar bloque modal original, reemplazando "Ver direcciones" por "sucursal cercana"
                var modalDiv  = item.querySelector('.js-shipping-suboption');
                var modalHtml = modalDiv ? modalDiv.outerHTML : '';
                modalHtml = modalHtml.replace(
                    /(<span[^>]*>)[\s\n]*Ver direcciones[\s\n]*(<\/span>)/,
                    '$1sucursal cercana$2'
                ).replace(
                    /class="(js-trigger-modal-zindex-top[^"]*)">/,
                    'class="$1" style="text-transform:none;">'
                );
                innerHtml = '<div class="shipping-method-name m-bottom-quarter" data-component="option.name">'
                          + textoPromesa + '</div>'
                          + modalHtml;
            }

            else if (tipo === 'pickup-magi') {
                var dataName    = input.getAttribute('data-name') || "";
                var barrioMatch = dataName.match(/Magi - ([^-]+?)\s*\(CABA\)/i);
                var barrio      = barrioMatch ? barrioMatch[1].trim() : 'nuestra oficina';
                textoPromesa = 'Retirá <span style="color:#2ea44f;font-weight:bold;">gratis</span> en '
                             + barrio + ' (lunes a viernes 9-18hs)';
                innerHtml = '<div class="shipping-method-name m-bottom-quarter" data-component="option.name">'
                          + textoPromesa + '</div>';
            }

            return buildLiWrapper(item, isChecked, innerHtml);
        };

        // --- Lógica principal ---
        var cp       = getCep(options);
        var zonaAMBA = esAMBA(cp);
        console.log('[envio] CEP recibido:', cp, '| esZonaAMBA:', zonaAMBA);

        var clone = response.clone();
        return clone.json().then(function(data) {
            if (data && data.html) {
                var parser = new DOMParser();
                var doc    = parser.parseFromString(data.html, 'text/html');

                var allItems = Array.prototype.slice.call(doc.querySelectorAll('.js-shipping-list-item'));

                var enviosDomicilio = allItems.filter(function(item) {
                    var label = item.querySelector('label.js-shipping-radio');
                    return label && label.getAttribute('data-shipping-type') === 'delivery';
                });

                var retirosSucursal = allItems.filter(function(item) {
                    var label = item.querySelector('label.js-shipping-radio');
                    return label && label.getAttribute('data-shipping-type') === 'pickup' && !esMagi(item);
                });

                var itemMagi = zonaAMBA
                    ? allItems.find(function(item) {
                        var label = item.querySelector('label.js-shipping-radio');
                        return label && label.getAttribute('data-shipping-type') === 'pickup' && esMagi(item);
                    })
                    : null;

                var itemDomicilio = getMejorItem(enviosDomicilio);
                var itemSucursal  = getMejorItem(retirosSucursal);

                if (itemDomicilio || itemSucursal || itemMagi) {
                    var htmlFinal = '<div class="full-width-container m-bottom">'
                        + '<ul class="list-unstyled box-container radio-button-container m-bottom-half">';

                    if (itemDomicilio) htmlFinal += buildItemHtml(itemDomicilio, 'delivery',        true);
                    if (itemSucursal)  htmlFinal += buildItemHtml(itemSucursal,  'pickup-sucursal', false);
                    if (itemMagi)      htmlFinal += buildItemHtml(itemMagi,      'pickup-magi',     false);

                    htmlFinal += '</ul></div>';
                    data.html = htmlFinal;
                }
            }

            return new Response(JSON.stringify(data), {
                status: response.status,
                headers: response.headers
            });
        });
    }
};

    // --- INTERCEPTOR GLOBAL (FETCH) ---
    window.fetch = function() {
        var args = Array.prototype.slice.call(arguments);
        var url = args[0];
        var options = args[1] || {};
        var matchedHandler = false;

        for (var path in requestHandlers) {
            if (typeof url === 'string' && url.indexOf(path) !== -1) {
                options = requestHandlers[path](url, options);
                args[1] = options;
                matchedHandler = true;
                break;
            }
        }

        if (!matchedHandler) {
            console.log("⏭️ Fetch ignorado (sin handler): " + url);
        }

        return window.originalFetch.apply(this, args).then(function(response) {
            for (var path in responseHandlers) {
                if (typeof url === 'string' && url.indexOf(path) !== -1) {
                    return responseHandlers[path](response, url, options); // ✅ pasa url y options
                }
            }
            return response;
        });
    };
})();
