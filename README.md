QSA CSS Selector Engine v1.2.2

Основные отличия от Sizzle - в два раза меньше размер обфусцированного файла, исходный так же присутствует.
Все по максимуму прокомментировано на русском языке. Скорость работы внутреннего поиска не используя встроенный
селектор в браузер, в среднем в полтора раза выше чем Sizzle. Почему сравниваю только Sizzle, потому что
единственный селектор который сортирует элементы на выходе.

другие селекторы, такие как:
 Mootools, Prototype, Dojo, DOMAssistant, jQuery( не Sizzle ), YASS и д.р. Не правильно сортируют элементы. Можете сами проверить.

тесты:
 (http://spb-piksel.ru/tests/speed/)
 (http://spb-piksel.ru/tests/speed2/)

Использование:

    qsa.querySelectorAll( string selector [, node/nodeList context(s), nodeList extra(s) ] );
    qsa.querySelectorAll( "div + p > a" );
    qsa.querySelectorAll( "div + p > a", document.getElemetById("myNode") );
    qsa.querySelectorAll( "div + p > a", document.getElemetById("myNode"), [ elem1, elem2, elem3 ] );

