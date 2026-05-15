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

        var calcularEfectivoDiff = function(textoFecha) {
            var match = textoFecha.match(/(\d{1,2})\/(\d{2})/);
            if (!match) return Infinity;
            var ahora       = new Date();
            var hora        = ahora.getHours();
            var diaSem      = ahora.getDay();
            var esHabil     = diaSem >= 1 && diaSem <= 5;
            var superaCorte = esHabil && hora >= 13;
            var hoy         = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate());
            var d           = new Date(ahora.getFullYear(), parseInt(match[2], 10) - 1, parseInt(match[1], 10));
            var diff        = Math.round((d - hoy) / 86400000);
            return superaCorte ? diff - 1 : diff;
        };

        var normalizarFecha = function(textoFecha) {
            var formatToday = function formatearTextoEntrega(texto) {
                const fechaActual = new Date();
                        
                // Obtiene día y mes con dos dígitos
                const dia = String(fechaActual.getDate()).padStart(2, '0');
                const mes = String(fechaActual.getMonth() + 1).padStart(2, '0');
                const fechaFormateada = `${dia}/${mes}`;
                        
                // Reemplaza "hoy" por "hoy [fecha]" de forma insensible a mayúsculas
                return texto.replace(/hoy/i, `hoy ${fechaFormateada}`);
            }

            textoFecha = formatToday(textoFecha);
            var reDate = /(\d{1,2})\/(\d{2})/g;
            var fechas = [];
            var match;
            while ((match = reDate.exec(textoFecha)) !== null) {
                fechas.push({ dia: parseInt(match[1], 10), mes: parseInt(match[2], 10) });
            }
            if (fechas.length === 0) return textoFecha;
            
            var ahora = new Date();
            var hora = ahora.getHours();
            var diaSem = ahora.getDay();
            var esHabil = diaSem >= 1 && diaSem <= 5;
            var corteHora = 13;
            var superaCorte = esHabil && hora >= corteHora;
            
            // Inicio del día de hoy en hora local (00:00:00)
            var medianocheHoy = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate());
            
            var toLocalDate = function(f) {
                return new Date(ahora.getFullYear(), f.mes - 1, f.dia);
            };
            
            var diffDias = function(localDate) {
                return Math.floor((localDate - medianocheHoy) / 86400000);
            };
            
            var nombreDia = function(localDate) {
                return ["domingo","lunes","martes","miércoles","jueves","viernes","sábado"][localDate.getDay()];
            };
            
            var labelDia = function(f) {
                var localD = toLocalDate(f);
                var diff = diffDias(localD);
                if (diff === 0 && superaCorte) return "mañana";
                if (diff === 0) return "hoy";
                if (diff === 1) return "mañana";
                var nombre = nombreDia(localD);
                if (diff <= 8 && diff > 1) return "el " + nombre;
                return "el " + nombre + " " + f.dia + "/" + (f.mes < 10 ? "0" + f.mes : f.mes);
            };
            var hasHoy = /\bhoy\b/i.test(textoFecha);
            var isBetweenPhrase = /\bentre\b/i.test(textoFecha);

            if (fechas.length === 1) {
                var diffF = diffDias(toLocalDate(fechas[0]));
                var l = labelDia(fechas[0]);
                if (hasHoy && isBetweenPhrase) {
                    // La fecha extraída es el extremo final de "entre hoy y X"
                    // Si esa fecha es hoy, el extremo final efectivo es mañana
                    if (superaCorte) return "mañana";
                    if (diffF === 0) return "entre hoy y mañana";
                    return "entre hoy y " + l;
                }
                return l;
            }

            if (fechas.length === 2) {
                var local1 = toLocalDate(fechas[0]);
                var local2 = toLocalDate(fechas[1]);
                var diff1 = diffDias(local1);
                var diff2 = diffDias(local2);
                var ambasHoy = (diff1 === 0 && diff2 === 0);
                var diff2Efectivo = ambasHoy ? 1 : diff2;
                var l1 = labelDia(fechas[0]);
                var l2 = ambasHoy ? "mañana" : labelDia(fechas[1]);
                if (superaCorte) {
                    if (diff1 === 0) return "mañana";
                    var efectivoDesdeDiff = diff1 + 1;
                    var efectivoHastaDiff = diff2Efectivo + 1;
                    if (efectivoDesdeDiff === efectivoHastaDiff || l1 === l2) {
                        return (efectivoDesdeDiff === 1 ? "mañana" : l2);
                    }
                    var desdeLabel = efectivoDesdeDiff === 1 ? "mañana" : l1;
                    var hastaLabel = efectivoHastaDiff === 1 ? "mañana" : l2;
                    return "entre " + desdeLabel + " y " + hastaLabel;
                }
                if (diff1 === 0) {
                    if (l2 === "hoy" || l1 === l2) return l2;
                    return "entre " + l1 + " y " + l2;
                }
                if (l1 === l2) return l1;
                return "entre " + l1 + " y " + l2;
            }
            return textoFecha;
        };

        // ─── Renderer formato ESTÁNDAR ─────────────────────────────────────

        var buildLiWrapper = function(item, isChecked, innerHtml) {
            var input      = item.querySelector('input');
            var label      = item.querySelector('label');
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
                    textoPromesa = '<span style="color:#478438;font-weight:bold;">Llega gratis</span> ' + fechaNorm;
                } else {
                    textoPromesa = 'Llega ' + fechaNorm + ' por ' + costo;
                }
                
                var efectivoDiff = calcularEfectivoDiff(fechaRaw);                
                fechaNorm = efectivoDiff <= 1 ? '<span style="color:#478438;font-weight:bold;">' + fechaNorm + '</span> ' : fechaNorm;

                var motoMensajeriaTxt = esGratis ? "por Moto - CABA" : "(Moto - CABA)";
                textoPromesa = textoPromesa + " " + (efectivoDiff <= 1 ? motoMensajeriaTxt : "");

                innerHtml = '<div class="shipping-method-name m-bottom-quarter" data-component="option.name">'
                          + textoPromesa + '</div>';
            }

            else if (tipo === 'pickup-sucursal') {
                var fechaRaw2  = getFechaDesdeDataName(item);
                var fechaNorm2 = normalizarFecha(fechaRaw2).replace(/^(retiras|retirás)\s+/i, '');
                var modalDiv   = item.querySelector('.js-shipping-suboption');
                var modalHtml  = modalDiv ? modalDiv.outerHTML : '';
                modalHtml = modalHtml
                    .replace(
                        /(<span[^>]*>)[\s\n]*Ver direcciones[\s\n]*(<\/span>)/,
                        '$1Ver sucursales$2'
                    )
                    .replace(
                        /class="(js-trigger-modal-zindex-top[^"]*)">/,
                        'class="$1" style="text-transform:none;font-size:13px !important">'
                    );
                if (esGratis) {
                    textoPromesa = '<span style="color:#478438;font-weight:bold;">Retirás gratis</span> ' + fechaNorm2;
                } else {
                    textoPromesa = 'Retirás ' + fechaNorm2 + ' por ' + costo;
                }
                innerHtml = '<div class="shipping-method-name m-bottom-quarter" data-component="option.name">'
                          + textoPromesa + '</div>'
                          + modalHtml;
            }

            else if (tipo === 'pickup-magi') {
                var dataName    = input.getAttribute('data-name') || "";
                var barrioMatch = dataName.match(/Magi - ([^-]+?)\s*\(CABA\)/i);
                var barrio      = barrioMatch ? barrioMatch[1].trim() : 'nuestra oficina';
                textoPromesa = '<span style="color:#478438;font-weight:bold;">Retirá gratis</span> en '
                             + barrio + ' (lunes a viernes 9-18hs)';
                innerHtml = '<div class="shipping-method-name m-bottom-quarter" data-component="option.name">'
                          + textoPromesa + '</div>';
            }

            return buildLiWrapper(item, isChecked, innerHtml);
        };

        // ─── Renderer formato PRODUCTO (/productos/) ───────────────────────

        var SVG_RAYO = '<svg width="17" height="17" viewBox="25 5 55 88" fill="none" style="color:#478438;">'
                     + '<path d="M65 10L30 55H50L35 90L75 40H55L65 10Z" stroke="currentColor" stroke-width="5" '
                     + 'stroke-linecap="round" stroke-linejoin="round" fill="none"/></svg>';

        var SVG_CAMION = '<svg width="20" height="16" viewBox="0 0 640 512" style="color:#478438;">'
                       + '<path d="M615.11,238.15l-51.78-77.69a50.61,50.61,0,0,0-42.11-22.53H454.94V87.33a50.61,50.61,0,0,0-50.6-50.61H67a50.6,50.6,0,0,0-50.6,50.61V357.2A50.6,50.6,0,0,0,67,407.81H85.55a84.35,84.35,0,0,0,165.29,0H355.43a84.35,84.35,0,0,0,165.29,0H573a50.6,50.6,0,0,0,50.6-50.61v-91A50.58,50.58,0,0,0,615.11,238.15ZM454.94,171.66h66.28a16.85,16.85,0,0,1,14,7.51l40,60H454.94ZM168.19,441.54a50.6,50.6,0,1,1,50.61-50.6A50.61,50.61,0,0,1,168.19,441.54Zm187.24-67.47H250.84a84.35,84.35,0,0,0-165.29,0H67A16.87,16.87,0,0,1,50.12,357.2V87.33A16.87,16.87,0,0,1,67,70.46H404.34A16.86,16.86,0,0,1,421.2,87.33v221A84.43,84.43,0,0,0,355.43,374.07Zm82.64,67.47a50.6,50.6,0,1,1,50.6-50.6A50.61,50.61,0,0,1,438.07,441.54ZM589.88,357.2A16.87,16.87,0,0,1,573,374.07H520.72a84.45,84.45,0,0,0-65.78-65.78V272.87H589.88Z" fill="currentColor"/></svg>';

        var SVG_TIENDA = '<svg width="18" height="16" viewBox="0 0 640 512" fill="#478438">'
                       + '<path d="M635.7 176.1l-91.4-160C538.6 6.2 528 0 516.5 0h-393C112 0 101.4 6.2 95.7 16.1l-91.4 160'
                       + 'C-7.9 197.5 7.4 224 32 224h32v254.5C64 497 78.3 512 96 512h256c17.7 0 32-15 32-33.5V224h160v280'
                       + 'c0 4.4 3.6 8 8 8h16c4.4 0 8-3.6 8-8V224h32c24.6 0 39.9-26.5 27.7-47.9z'
                       + 'M352 478.5c0 .9-.3 1.4-.2 1.5l-255.2.2s-.6-.5-.6-1.7V352h256v126.5zm0-158.5H96v-96h256v96z'
                       + 'M32.1 192l91.4-160h393L608 192H32.1z"/></svg>';

        var buildLineaProducto = function(svg, texto) {
            return '<span style="display:grid;grid-template-columns:22px 1fr;align-items:start;'
                 + 'gap:8px;font-size:14px;color:#478438;line-height:1.4;margin-bottom:12px;font-family:inherit;">'
                 + '<span style="display:flex;align-items:center;justify-content:flex-start;width:22px;padding-top:2px;">'
                 + svg
                 + '</span>'
                 + '<span style="display:inline-block; width:100%; white-space:normal;">' + texto + '</span>'
                 + '</span>';


        };

        var buildHtmlProducto = function(itemDomicilio, itemSucursal, itemMagi) {
            var lineas = [];
        
            if (itemDomicilio) {
                var input    = itemDomicilio.querySelector('input');
                var costRaw  = (input.getAttribute('data-cost') || "").trim();
                var esGratis = costRaw.toLowerCase().indexOf('gratis') !== -1;
                var costo    = formatCosto(costRaw);
                var fechaRaw = getFechaDesdeDataName(itemDomicilio);
                var fechaNorm = normalizarFecha(fechaRaw).replace(/^(llega|retiras|retirás)\s+/i, '');
                var efectivoDiff = calcularEfectivoDiff(fechaRaw);
                
                fechaNorm = efectivoDiff <= 1 ? '<span style="color:#478438;font-weight:bold;">' + fechaNorm + '</span> ' : fechaNorm;

                var textoDom = esGratis
                    ? '<span style="color:#478438;font-weight:bold;">Llega gratis</span> ' + fechaNorm
                    : 'Llega ' + fechaNorm + ' por ' + costo;
                
                var motoMensajeriaTxt = esGratis ? "por Moto - CABA" : "(Moto - CABA)";
                textoDom = textoDom + " " + (efectivoDiff <= 1 ? motoMensajeriaTxt : "");
        
                var svgDom = efectivoDiff <= 1 ? SVG_RAYO : SVG_CAMION;
                lineas.push(buildLineaProducto(svgDom, textoDom));
            }
        
            if (itemSucursal) {
                var inputS    = itemSucursal.querySelector('input');
                var costRawS  = (inputS.getAttribute('data-cost') || "").trim();
                var esGratisS = costRawS.toLowerCase().indexOf('gratis') !== -1;
                var costoS    = formatCosto(costRawS);
                var fechaRawS  = getFechaDesdeDataName(itemSucursal);
                var fechaNormS = normalizarFecha(fechaRawS).replace(/^(retiras|retirás)\s+/i, '');

                /*
                var aTag       = itemSucursal.querySelector('a[data-toggle="modal"]');
                var modalHref  = aTag ? aTag.getAttribute('href') : '#';
                var linkSuc    = '<a href="' + modalHref + '" data-toggle="modal" '
                               + 'class="js-trigger-modal-zindex-top btn-link btn-block" '
                               + 'style="text-transform:none;color:#2e7d32;">sucursal cercana</a>';
                */
                var modalDivSuc   = itemSucursal.querySelector('.js-shipping-suboption');
                var modalHtmlSuc  = modalDivSuc ? modalDivSuc.outerHTML : '';
                modalHtmlSuc = modalHtmlSuc
                    .replace(
                        /(<span[^>]*>)[\s\n]*Ver direcciones[\s\n]*(<\/span>)/,
                        '$1Ver sucursales$2'
                    )
                    .replace(
                        /class="(js-trigger-modal-zindex-top[^"]*)">/,
                        'class="$1" style="text-transform:none;font-size:12px !important; margin-top: 1px">'
                    );





                var textoSuc = esGratisS
//                    ? 'Retirás <span style="color:#478438;font-weight:bold;">gratis</span> ' + fechaNormS + ' en ' + linkSuc
//                    : 'Retirás ' + fechaNormS + ' por ' + costoS + ' en ' + linkSuc;
                    ? '<span style="color:#478438;font-weight:bold;">Retirás gratis</span> ' + fechaNormS
                    : 'Retirás ' + fechaNormS + ' por ' + costoS;

                lineas.push(buildLineaProducto(SVG_CAMION, textoSuc + modalHtmlSuc));
            }
        
            if (itemMagi) {
                var inputM      = itemMagi.querySelector('input');
                var dataName    = inputM.getAttribute('data-name') || "";
                var barrioMatch = dataName.match(/Magi - ([^-]+?)\s*\(CABA\)/i);
                var barrio      = barrioMatch ? barrioMatch[1].trim() : 'nuestra oficina';
                var textoMagi   = '<span style="color:#478438;font-weight:bold;">Retirá gratis</span> en '
                                + barrio + ' (lunes a viernes 9-18hs)';
                lineas.push(buildLineaProducto(SVG_TIENDA, textoMagi));
            }
        
            return '<div style="font-family:Arial,sans-serif;max-width:320px;padding:8px 0;">'
                 + '<div style="display:flex;flex-direction:column;gap:5px;">'
                 + lineas.join('')
                 + '</div></div>';
        };

        
        // ─── Lógica principal ──────────────────────────────────────────────

        var cp       = getCep(options);
        var zonaAMBA = esAMBA(cp);
        var esProducto = window.location.pathname.indexOf('/productos/') !== -1;
        //console.log('[envio] CEP recibido:', cp, '| esZonaAMBA:', zonaAMBA, '| esProducto:', esProducto);

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

                    if (esProducto) {
                        // ── Formato producto: HTML estático con íconos ──
                        data.html = buildHtmlProducto(itemDomicilio, itemSucursal, itemMagi);

                    } else {
                        // ── Formato estándar: lista de opciones seleccionables ──
                        var hiddenInputs = '';
                        var docOrig = (new DOMParser()).parseFromString(data.html, 'text/html');
                        docOrig.querySelectorAll('input[type="hidden"]').forEach(function(inp) {
                            hiddenInputs += inp.outerHTML;
                        });

                        var htmlFinal = '<div class="full-width-container m-bottom">'
                            + '<ul class="list-unstyled box-container radio-button-container m-bottom-half">';

                        if (itemDomicilio) htmlFinal += buildItemHtml(itemDomicilio, 'delivery',        true);
                        if (itemSucursal)  htmlFinal += buildItemHtml(itemSucursal,  'pickup-sucursal', false);
                        if (itemMagi)      htmlFinal += buildItemHtml(itemMagi,      'pickup-magi',     false);

                        htmlFinal += '</ul></div>' + hiddenInputs;
                        data.html = htmlFinal;
                    }
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
