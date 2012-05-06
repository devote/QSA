/*
 * QSA CSS3 Selector Engine v1.3
 *
 * Copyright 2011, Dmitriy Pakhtinov ( spb.piksel@gmail.com )
 *
 * http://spb-piksel.ru/
 *
 * Dual licensed under the MIT and GPL licenses:
 *   http://www.opensource.org/licenses/mit-license.php
 *   http://www.gnu.org/licenses/gpl.html
 *
 * Update: 06-05-2012
 */

(function( window, undefined ) {

	"use strict";

	var _, // переменная пустышка, ипользуеться в try catch
		// основная регулярка разбивки селекторов
		mqsa = /\s*(?:(\*|(?:(?:\*|[\w\-]+)\|)?(?:[\w\-]+|\*)))?(?:\[\s*(?:((?:[\w\-]+\|)?[\w\-]+)\s*((?:~|\^|\$|\*|\||!)?=)\s*)?((?:".*?(?:(?:[\\]{2}(?="))|[^\\])"|'.*?(?:(?:[\\]{2}(?='))|[^\\])'|[^\]].*?)?)\s*\])?(?:(\.|#)([\w\-]+))?(?:(:(?::)?)([\w\-]+)(?:\(\s*([^)]+)\s*\))?)?(?:(?:\s*(?=\s))?(?:(?:\s(?=,|>|\+|~))?([\s,>+~](?!$)))?)?/g,
		// проверка на дубликаты
		baseHasDuplicate = true,
		hasDuplicate = false,
		// ссылка на документ
		doc = window.document,
		docEl = doc.documentElement,
		// прототипы
		pSlice = Array.prototype.slice,
		pSplice = Array.prototype.splice,
		pPush = Array.prototype.push,
		testDiv = doc.createElement( "div" ),
		matches = docEl.matchesSelector ||
			docEl.oMatchesSelector ||
			docEl.mozMatchesSelector ||
			docEl.webkitMatchesSelector ||
			docEl.msMatchesSelector,
		dMatch = matches && !matches.call( testDiv, "div" ),

	// есть ли встроенный поиск селекторов
	hasQSA = (function(){
		testDiv.innerHTML = "<p class='TEST'></p>";
		return !( !testDiv.querySelectorAll || testDiv.querySelectorAll(".TEST").length === 0 );
	})(),

	qsa = {

		moveElems: (function() {

			var hasSlice = true;

			testDiv.innerHTML = "";
			testDiv.appendChild( doc.createComment("") );

			try {
				pSlice.call( docEl.childNodes, 0 );
			} catch ( _ ) { hasSlice = false }

			if ( testDiv.getElementsByTagName("*").length > 0 || !hasSlice ) {
				return function( elems, ret, seed, rmComment, isArray ) {
					if ( !seed && !rmComment && hasSlice ) {
						pPush.apply( ret, pSlice.call( elems, 0 ) );
					} else if ( !seed && !rmComment && isArray ) {
						pPush.apply( ret, elems );
					} else {
						var i = 0, l = ret.length;
						for( ; elems[ i ]; i++ ) {
							if ( elems[ i ].nodeType === 1 && ( !seed || seed === elems[ i ] ) ) {
								ret[ l++ ] = elems[ i ];
							}
						}
						l === ret.length || ( ret.length = l );
					}
					return ret;
				}
			} else {
				return function( elems, ret, seed ) {
					if ( seed ) {
						var i = 0, l = ret.length;
						for( ; elems[ i ]; i++ ) {
							if ( elems[ i ].nodeType === 1 && seed === elems[ i ] ) {
								ret[ l++ ] = elems[ i ];
							}
						}
						l === ret.length || ( ret.length = l );
					} else {
						pPush.apply( ret, pSlice.call( elems, 0 ) );
					}
					return ret;
				}
			}
		})(),

		// сортировка элементов
		sortElems: (function() {
			[0, 0].sort(function() {
				baseHasDuplicate = false;
				return 0;
			});

			if ( docEl.compareDocumentPosition ) {
				return function( a, b ) {
					if ( a == b ) {
						hasDuplicate = true;
						return 0;
					}
					if ( docEl.compareDocumentPosition ) {
						if ( !a.compareDocumentPosition || !b.compareDocumentPosition ) {
							return a.compareDocumentPosition ? -1 : 1;
						}
						return a.compareDocumentPosition( b ) & 4 ? -1 : a === b ? 0 : 1;
					}
				}
			} else if ( "sourceIndex" in docEl ) {
				return function( a, b ) {
					if ( a == b ) {
						hasDuplicate = true;
						return 0;
					}
					if ( !a.sourceIndex || !b.sourceIndex ) {
						return a.sourceIndex ? -1 : 1;
					}
					return a.sourceIndex - b.sourceIndex;
				}
			} else if ( doc.createRange ) {
				return function( a, b ) {
					if ( a == b ) {
						hasDuplicate = true;
						return 0;
					}
					if ( !a.ownerDocument || !b.ownerDocument ) {
						return a.ownerDocument ? -1 : 1;
					}

					var aRange = a.ownerDocument.createRange(),
						bRange = b.ownerDocument.createRange();
					aRange.setStart( a, 0 );
					aRange.setEnd( a, 0 );
					bRange.setStart( b, 0 );
					bRange.setEnd( b, 0 );
					return aRange.compareBoundaryPoints( Range.START_TO_END, bRange );
				}
			} else {
				return function( a, b ) {
					if ( a == b ) {
						hasDuplicate = true;
					}
					return 0;
				}
			}
		})(),

		// альтернатива атрибутам
		attrMap: {
			"class": "className",
			"for": "htmlFor"
		},

		// движок атрибутов
		attrHandle: {
			href: function( elem ) {
				return elem.getAttribute( "href", 2 );
			},
			type: function( elem ) {
				return elem.getAttribute( "type" );
			},
			style: function( elem ) {
				var style = elem.getAttribute( "style" );
				if ( typeof style === "object" ) {
					return elem.style.cssText || "";
				} else {
					return style;
				}
			}
		},

		// проверка атрибутов
		checkAttr: function( chunks, elem, attr ) {

			var attr = qsa.attrHandle[ attr ] ? qsa.attrHandle[ attr ]( elem ) :
				elem[ attr ] != null ? elem[ attr ] : elem.getAttribute( attr ),
				type = chunks[ 3 ],
				check = chunks[ 4 ],
				value = attr + "";

			// ничего нового, взято из Sizzle, ибо лучше придумать не реально и немного доработано
			return attr == null ?
				type === "!=" :
				type === "=" ?
				value === check :
				type === "*=" ?
				value.indexOf( check ) >= 0 :
				type === "~=" ?
				(" " + value + " ").indexOf( " " + check + " " ) >= 0 :
				!check ?
				value && attr !== false :
				type === "!=" ?
				value !== check :
				type === "^=" ?
				value.indexOf( check ) === 0 :
				type === "$=" ?
				value.substr( value.length - check.length ) === check :
				type === "|=" ?
				value === check || value.substr( 0, check.length + 1 ) === check + "-" :
				false;
		},

		// фильтры селекторов
		filters: (function(){
			// проверка на номерацию элемента, нужен для :nth псевдо-классов
			function calc( elem, rule, i ) {
				var diff = i - rule[ 1 ];

				if ( rule[ 0 ] === 0 ) {
					return diff === 0;
				}
				return ( diff % rule[ 0 ] === 0 && diff / rule[ 0 ] >= 0 );
			}

			var filters = {
				// фильтры псевдо-классов
				":": {
					// псевдо-класс каждый N-й от начала
					"nth-child": function( elem, rule ) {
						return calc( elem, rule, elem.nodeIndex || 1 );
					},
					// псевдо-класс каждый N-й от конца
					"nth-last-child": function( elem, rule ) {
						var p = elem.parentNode,
							i = p && ( ( p._qsaCE || p.children.length || 0 ) + 1 ) || 2;
						return calc( elem, rule, i - ( elem.nodeIndex || 1 ) );
					},
					// первый у родителя
					"first-child": function( elem ) {
						elem = elem.previousSibling;
						return !( elem && ( elem.nodeType === 3 ? elem.previousSibling : 1 ) );
					},
					// последний у родителя
					"last-child": function( elem ) {
						elem = elem.nextSibling;
						return !( elem && ( elem.nodeType === 3 ? elem.nextSibling : 1 ) );
					},
					// если элемент пуст, нет детей и текста
					empty: function( elem ) {
						return !elem.firstChild;
					},
					// если элемент активен
					enabled: function( elem ) {
						return elem.disabled === false && elem.type !== "hidden";
					},
					// если элемент не активен
					disabled: function( elem ) {
						return elem.disabled === true;
					},
					// если элемент чекнут
					checked: function( elem ) {
						return elem.checked === true;
					},
					// все кроме указанного в правилах, простой селектор
					not: function( elem, content, _, chunks ) {
						if ( ( !chunks[ 1 ] || chunks[ 1 ] && elem.nodeName === chunks[ 1 ] ) &&
							qsa.checkRule( chunks, [ elem ], [] ).length > 0 ) {
							return false;
						}
						return true;
					},
					// содержит текст
					contains: function( elem, content ) {
						return ( elem.textContent || elem.innerText || elem.nodeValue || elem.value || "" ).indexOf( content ) >= 0;
					}
				},
				// фильтры псевдо-элементов
				"::": {
					
				}
			}

			// если единственный у родителя
			filters[":"]["only-child"] = function( elem ) {
				return filters[":"]["first-child"]( elem ) && filters[":"]["last-child"]( elem );
			}

			return filters;
		})(),

		// подготовка данных для фильтров
		preFilters: (function(){
			var pre = {
				// подготовка фильтра для nth
				"nth-child": function( chunks ) {
					var rule = chunks[ 9 ].replace( /^\+|\s*/g, '' ),
						test = /(-?)(\d*)(?:n([+\-]?\d*))?/.exec( rule === "even" && "2n" || rule === "odd" && "2n+1" || !/\D/.test( rule ) && "0n+" + rule || rule );

					chunks[ 9 ] = [ ( test[ 1 ] + ( test[ 2 ] || 1 ) ) - 0, test[ 3 ] - 0 ];
					return !( chunks[ 9 ][ 0 ] === 1 && chunks[ 9 ][ 1 ] === 0 );
				}
			}
			// с конца
			pre["nth-last-child"] = pre["nth-child"];
			return pre;
		})(),

		// проверить все правила элементов
		checkRule: function( chunks, elems, extra, tag, seed ) {

			// всякие переменные =)
			var i, l, elem, j = elems.length,
				attr, value, pre = false, type, pseudo, m,
				index = 0, parent, node;

			// подготавливаем атрибуты
			if ( !chunks[ 2 ] && chunks[ 4 ] ) {
				// если просто нужно проверить наличие атрибута
				chunks[ 2 ] = chunks[ 4 ];
				chunks[ 4 ] = undefined;
			} else if ( chunks[ 4 ] ) {
				// удалить кавычки если имеются
				chunks[ 4 ] = chunks[ 4 ].replace( /^(?:"(.*)"|'(.*)')$/, '$1$2' ).replace( /\\/g, "" );
			}

			// проверяем наличие реальных атрибутов
			attr = qsa.attrMap[ chunks[ 2 ] ] || chunks[ 2 ];

			// просто подготавливаем данные, оптимизация
			type = chunks[ 5 ] === "." ? 1 : chunks[ 5 ] === "#" ? 2 : false;
			value = chunks[ 6 ];
			pseudo = qsa.filters[ chunks[ 7 ] ] && qsa.filters[ chunks[ 7 ] ][ chunks[ 8 ] ] || chunks[ 8 ] && qsa.error( chunks[ 8 ] ) || false;

			if ( !attr && !type && !pseudo && j ) {
				// если правил нет, просто заносим элементы куда положено
				qsa.moveElems( elems, extra, seed, !tag, elems instanceof Array );

			} else {

				// если есть псевдо
				if ( pseudo && chunks[ 9 ] ) {
					// подготовим его
					mqsa.lastIndex = 0;
					m = mqsa.exec( chunks[ 9 ] );
					// если тег есть, заменим вертикальную черту на двоеточие (namespace) и все в вверхний регистр
					m[ 1 ] = ( m[ 1 ] && m[ 1 ] !== "*" ) ? m[ 1 ].replace( "|", ':' ).toUpperCase() : undefined;
					// делаем предподготовку к псевдо-классу
					qsa.preFilters[ chunks[ 8 ] ] && ( pre = qsa.preFilters[ chunks[ 8 ] ]( chunks ) );
				}

				l = extra.length;

				for( i = 0; i < j; i++ ) {

					elem = elems[ i ];

					if ( elem.nodeType === 1 ) {
						// проверка атрибутов на совпадение
						if ( attr && !qsa.checkAttr( chunks, elem, attr ) ) {
							elem = null;
						}

						// проверка по классу или id
						if ( elem && type ) {

							if ( type === 1 ) {
								// проверка по классу
								if ( !elem.className || !( (" " + elem.className + " ").indexOf( " " + value + " " ) >= 0 ) ) {
									elem = null;
								}
							} else if ( type === 2 ) {
								// проверка по id
								if ( elem.id !== value ) {
									elem = null;
								}
							}
						}

						// проверка по псевдо-классу/элементу
						if ( elem && pseudo ) {

							// подготовка элементов к псевдо nth
							// если пре-фильтрация успешна, и нет индексов, или произошли изменения в DOM. то пронумеруем все заново
							if ( pre && ( parent = elem.parentNode ) && ( !elem.nodeIndex || parent._qsaCL !== parent.children.length ) ) {
								index = 0;
								// пронумеруем всех детей
								for ( node = parent.firstChild; node; node = node.nextSibling ) {
									if ( node.nodeType === 1 ) {
										node.nodeIndex = ++index;
									}
								}
								// запомним количество реальных детей
								parent._qsaCE = index;
								// запомним общую длинну элементов у родителя
								parent._qsaCL = parent.children.length;
							}

							if ( !pseudo( elem, chunks[ 9 ], chunks, m ) ) {
								elem = null;
							}
						}

						if ( seed && seed !== elem ) {
							elem = null;
						}

						// если элемент не удалили, заносим его в стек
						elem && ( extra[ l++ ] = elem );
					}
				}

				l === extra.length || ( extra.length = l );
			}

			return extra;
		},

		// Только для внутреннего использования
		parser: function( selector, context, extra, sub, seed ) {

			// подготавливаем переменные
			var m, i, j, k, l, n, o, len = selector.length, elems,
				elem, child, prevRule = true, nextRule, cache = [],
				parts = [], part, tagOnly, from, out = extra[ 0 ],
				lastIndex = mqsa.lastIndex, tag, uTag, index;

			// делаем поиск по всем контентам
			for( i = 0, j = context.length; i < j; i++ ) {

				from = context[ i ];

				// сбрасываем позицию на стартовую, для поиска в следующем контенте.
				index = lastIndex;

				do {
					mqsa.lastIndex = index;
					// ищем часть селектора
					m = mqsa.exec( selector );

					// если в селекторе ниче нет существенного, выводим синтаксическую ошибку в лог
					if ( ( tagOnly = !m[ 4 ] && !m[ 5 ] && !m[ 7 ] ) && !m[ 1 ] ) qsa.error( selector.substring( index ) );

					index = mqsa.lastIndex;

					// проверяем имя тега
					tag = ( m[ 1 ] && m[ 1 ] !== "*" ) ? m[ 1 ].replace( "|", ':' ) : undefined;

					nextRule = m[ 10 ];

					if ( tagOnly && prevRule === true && ( nextRule === "~" || nextRule === ">" ) ) {

						parts.push({ tag: tag ? tag.toUpperCase() : tag, rule: nextRule });
						nextRule = true;
						elems = [];

					// если в пердыдущем куске селектора был запрос на детей
					} else if ( prevRule === ">" ) {
						elems = [];

						// переводи имя тега в вверхний регистр
						uTag = tag ? tag.toUpperCase() : tag;

						// складываем всех детей для дальнейшего фильтра
						for( k = 0; elem = cache[ k ]; k++ ) {

							elem = elem.children;

							for( n = 0; child = elem[ n ]; n++ ) {
								if ( child.nodeType === 1 ) {
									if ( uTag ) {
										// берем лишь тех детей которые совпадают по имени тега
										if ( uTag === child.nodeName ) {
											elems[ elems.length ] = child;
										}
									} else {
										// берем всех детей
										elems[ elems.length ] = child;
									}
								}
							}
						}

						// затребовать сортировку элементов в конце
						extra[ 1 ] = true;

					// если запрос был на поиск элементов от одного родителя
					} else if ( prevRule === "+" || prevRule === "~" ) {
						elems = [];

						for( k = 0, l = cache.length; k < l; k++ ) {

							// переводи имя тега в вверхний регистр
							uTag = tag ? tag.toUpperCase() : tag;

							elem = cache[ k ];

							// получаем братственный элемент
							while ( elem = elem.nextSibling ) {
								// если тип элемента нам по душе
								if ( elem.nodeType === 1 ) {

									if ( uTag ) {
										// берем лишь тех детей которые совпадают по имени тега
										if ( uTag === elem.nodeName ) {
											elems[ elems.length ] = elem;
										}
									} else {
										// берем всех детей
										elems[ elems.length ] = elem;
									}

									// если запрос лишь на один элемент, выходим.
									if ( prevRule === "+" ) break;
								}
							}
						}

						// затребовать сортировку элементов в конце
						extra[ 1 ] = true;

					// поиск по id ищем нужные элементы
					} else if ( ( m[ 5 ] === "#" && !( o = false ) ) || ( m[ 2 ] === "id" && m[ 3 ] === "=" && ( o = true ) ) ) {

						if ( o ) {
							m[ 6 ] = m[ 4 ].replace( /^(?:"(.*)"|'(.*)')$/, '$1$2' ).replace( /\\/g, "" );
							m[ 2 ] = m[ 3 ] = m[ 4 ] = undefined;
						}

						elems = [];
						n = m[ 6 ];

						if ( from === doc ) {
							cache = [];
							uTag = tag ? tag.toUpperCase() : tag;
							// ищем все элементы с совпавшим ID в контексте document
							do {
								child = doc.getElementById( n );
								if ( child ) {
									// нашли элемент
									cache[ cache.length ] = child;
									child.setAttribute( "id", n + " _" );
								}
							} while( child );

							for( o = 0; elem = cache[ o ]; o++ ) {
								// возвращаем атрибуты всем найденым обратно
								elem.setAttribute( "id", n );
								if ( !uTag || elem.nodeName === uTag ) {
									elems[ elems.length ] = elem;
								}
							}
						} else {
							// ищем все элементы в других контекстах
							cache = from.getElementsByTagName( tag || '*' );

							for( o = 0; elem = cache[ o ]; o++ ) {
								if ( elem.id && elem.id === n ) {
									elems[ elems.length ] = elem;
								}
							}
						}

						m[ 5 ] = undefined;

					// поиск элементов по имени класса, если имеем внутренню поддержку поиска по классу и не указано конкретное имя тега
					} else if ( m[ 5 ] === "." && !tag && from.getElementsByClassName ) {

						elems = from.getElementsByClassName( m[ 6 ] );

						tagOnly = !m[ 4 ] && !m[ 7 ] && ( ( nextRule === "," ) || ( index === len ) );

						m[ 5 ] = undefined;

					} else {
						// получаем все элементы с именем указанном в селекторе, либо все элементы
						elems = from.getElementsByTagName( tag || '*' );
					}

					if ( tagOnly ) {
						// если параметров у селектора нет, и ищем только тег
						cache = elems;
						// если это конец селектора
						if ( parts.length == 0 && elems.length && ( ( nextRule === "," ) || ( index === len ) ) ) {
							// заносим элементы в выходной стек
							qsa.moveElems( elems, out, seed, !tag, elems instanceof Array );
						}

					} else {

						if ( elems.length > 0 ) {
							// пропускаем все найденые элементы через фильтр правил
							if ( ( parts.length == 0 ) && ( ( nextRule === "," ) || ( index === len ) ) ) {
								cache = qsa.checkRule( m, elems, out, tag, seed );
							} else {
								cache = qsa.checkRule( m, elems, [], tag );
							}
						} else {
							cache = [];
						}

						// если у предыдущих элементов есть дополнительное правило
						if ( !nextRule && index < len ) {

							l = cache.length;

							do {

								mqsa.lastIndex = index;
								// получаем правило
								m = mqsa.exec( selector );

								index = mqsa.lastIndex;

								nextRule = m[ 10 ];

								// проверяем дополнительные правила для оставшихся элементов
								if ( l ) {
									if ( ( parts.length == 0 ) && ( ( nextRule === "," ) || ( index === len ) ) ) {
										cache = qsa.checkRule( m, cache, out, tag, seed );
									} else {
										cache = qsa.checkRule( m, cache, [], tag );
									}
									l = cache.length;
								}

								// если правила для оставшихся элементов закончились, выходим отсюда
								if ( nextRule ) break;

							} while( index < len );
						}
					}

					if ( nextRule !== true && parts.length > 0 ) {

						// поиск элементов в обратном порядке
						if ( cache.length === 0 ) {
							// если искать негде
							parts.length = 0;
						} else {
							// сохраним элементы
							elems = [];
							for( n = 0; elem = cache[ n ]; ) {
								elems[ n++ ] = elem;
							}

							k = out.length;

							while( part = parts.pop() ) {

								l = parts.length;

								if ( part.rule === ">" ) {
									// поиск детей
									for( n = 0; elem = elems[ n ]; n++ ) {
										if ( elem.parentNode && ( !part.tag || elem.parentNode.nodeName === part.tag ) ) {
											if ( l === 0 ) {
												if ( ( nextRule === "," ) || ( index === len ) ) {
													out[ k++ ] = cache[ n ];
												} else {
													elems[ n ] = cache[ n ];
												}
											} else {
												elems[ n ] = elem.parentNode;
											}
										} else {
											elems[ n ] = true;
										}
									}
								} else {
									// поиск братьев
									for( n = 0; elem = elems[ n ]; n++ ) {

										elem = elem.previousSibling;

										o = false;
										while( elem ) {
											if ( elem.nodeType === 1 ) {
												if ( !part.tag || elem.nodeName === part.tag ) {

													if ( l === 0 ) {
														if ( ( nextRule === "," ) || ( index === len ) ) {
															out[ k++ ] = cache[ n ];
														} else {
															elems[ n ] = cache[ n ];
														}
													} else {
														elems[ n ] = elem;
													}

													o = true;
													break;
												}
											}
											elem = elem.previousSibling;
										}
										if ( !o ) {
											elems[ n ] = true;
										}
									}
								}
							}
							// нужно если в экстру передали объект а не массив
							k === out.length || ( out.length = k );

							// если это не конец селектора
							if ( !( ( nextRule === "," ) || ( index === len ) ) ) {
								// переносим оставшиеся элементы в стек
								cache = [];
								for( n = 0; elem = elems[ n ]; n++ ) {
									elem !== true && ( cache.push( elem ) );
								}
							}
						}
					}

					// если нужно найти элементы в текущих найденых элементах
					if ( nextRule === " " ) {
						// если есть где искать
						if ( cache.length > 0 ) {
							// запускаем метод рекурсивно, указав как контекст текущие элементы
							mqsa.lastIndex = index;

							extra = qsa.parser( selector, cache, extra, true, seed );

							index = mqsa.lastIndex;

							// затребовать сортировку элементов в конце
							extra[ 1 ] = true;

						// если контекст пуст
						} else {
							// пропускаем ненужное правило поиска
							mqsa.lastIndex = index;

							do {
								m = mqsa.exec( selector );
								// если в селекторе ниче нет существенного, выводим синтаксическую ошибку в лог
								if ( !m[ 4 ] && !m[ 5 ] && !m[ 7 ] && !m[ 1 ] ) qsa.error( selector.substring( index ) );

								if ( m[ 10 ] === "," ) break;
							} while( mqsa.lastIndex < len );

							index = mqsa.lastIndex;

							nextRule = m[ 10 ];
						}
					}

					// если имеем другой селектор
					if ( nextRule === "," ) {

						// затребовать сортировку элементов в конце
						extra[ 1 ] = true;

						// если находимся в рекурсии, возвращаем управление главному искателю
						if ( sub ) break;
					}

					// запомним текущее правило для следующих элементов
					prevRule = nextRule;

				// если индекс поиска меньше длинны селектора, продолжаем искать
				} while( index < len );

			}

			// возвращаем найденые элементы
			return extra;
		},

		/*
		* Основная функция поиска элементов ( селектор CSS )
		*
		* @selector	- строка запроса
		* @context	- контекст поиска, либо элемент, либо массив елементов. Не обязательный
		* @extra	- массив элементов, которые будут дополнены найдеными.	Не обязательный
		*/
		querySelectorAll: function( selector, context, extra, noSort, seed ) {

			// добавить к уже имеющимся элементам
			extra = extra || [];

			// если это объект, проверяем/добавляем свойство length
			extra.length = extra.length || 0;

			// контекст поиска
			context = context && ( context.nodeType ? [ context ] : context ) || [ doc ];

			// сбрасываем регулярку в начало
			mqsa.lastIndex = 0;

			var i, j, results, elem, qsaStart = true,
				isArray = extra instanceof Array;

			if ( hasQSA ) {
				var parent, oid, nid, firstCom = /^\s*[>+~]/.test( selector );

				results = [ extra, ( extra.length > 0 || context.length > 1 ) ]

				for( i = 0, j = context.length; i < j; i++ ) {

					elem = context[ i ];

					// если контекст document
					if ( elem.nodeType === 9 ) {
						try {
							qsa.moveElems( elem.querySelectorAll( selector ), results[ 0 ], seed );
							qsaStart = false;
						} catch( _ ) {
							// при останавливаем все, и пробуем запустить внутренний поиск
							break;
						}

					// если элемент совпадает по критериям
					} else if ( elem.nodeType === 1 && elem.nodeName !== "OBJECT" ) {

						// если попытка запустить релативный поиск или детей контекста
						if ( firstCom && ( parent = elem.parentNode ) ) {

							// будем искать начиная с родителя нашего контекста
							oid = elem.getAttribute( "id" );
							nid = oid && oid.replace( /'/g, "\\$&" ) || '__qsaEngine__';
							!oid && elem.setAttribute( "id", nid );

							try {
								qsa.moveElems( parent.querySelectorAll( "[id='" + nid + "'] " + selector ), results[ 0 ], seed );
								qsaStart = false;
							} catch( _ ) {
								// при останавливаем все, и пробуем запустить внутренний поиск
								break;
							}

							!oid && elem.removeAttribute( "id" );
						} else if ( !firstCom ) {
							try {
								qsa.moveElems( elem.querySelectorAll( selector ), results[ 0 ], seed );
								qsaStart = false;
							} catch( _ ) {
								// при останавливаем все, и пробуем запустить внутренний поиск
								break;
							}
						} else {
							break;
						}
					}
				}
			}

			if ( qsaStart ) {
				// Запускаем поиск элементов
				results = qsa.parser( selector, context, [ extra, ( extra.length > 0 || context.length > 1 ) ], 0, seed );
			}

			// если требуеться сортировка
			if ( results[ 1 ] && extra.length > 1 ) {

				if ( !noSort ) {
					hasDuplicate = baseHasDuplicate;
					// Сортировка для всех остальных
					Array.prototype.sort.call( extra, qsa.sortElems );

					if ( hasDuplicate ) {
						// Удаляем одинаковые элементы
						for( i = 1; i < extra.length; i++ ) {
							if ( extra[ i ] === extra[ i - 1 ] ) {
								pSplice.call( extra, i--, 1 );
								// если в экстру передали объект а не массив
								// ИЕ не удаляет элемент через splice в объекте
								if ( !isArray ) {
									delete extra[ extra.length ];
								}
							}
						}

					}
				} else {
					i = extra.length;
					while( i-- ) {
						if ( extra[ i ]._hasDuplicate ) {
							pSplice.call( extra, i, 1 );
							// если в экстру передали объект а не массив
							// ИЕ не удаляет элемент через splice в объекте
							if ( !isArray ) {
								delete extra[ extra.length ];
							}
						} else {
							extra[ i ]._hasDuplicate = true;
						}
					}
					i = extra.length;
					while( i-- ) {
						extra[ i ]._hasDuplicate = null;
					}
				}

			}

			// поиск закончен
			return extra;
		},

		matchesSelector: function( node, selector ) {
			if ( matches ) {
				var ret = matches.call( node, selector );
				if ( ret || !dMatch || node.document && node.document.nodeType !== 11 ) {
					return ret;
				}
			}
			return qsa.querySelectorAll( selector, null, null, true, node ).length > 0;
		},

		error: function( msg ) {
			throw new Error( "Syntax error: " + msg );
		}
	}

	window.qsa = qsa;

})( window );
