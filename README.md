QSA CSS3 Selector Engine v1.3

�������� ������� �� Sizzle - � ��� ���� ������ ������ ���������������� �����, �������� ��� �� ������������.
��� �� ��������� ����������������� �� ������� �����. �������� ������ ����������� ������ �� ��������� ����������
�������� � �������, � ������� � ������� ���� ���� ��� Sizzle. ������ ��������� ������ Sizzle, ������ ���
������������ �������� ������� ��������� �������� �� ������.

������ ���������, ����� ���:
 Mootools, Prototype, Dojo, DOMAssistant, jQuery( �� Sizzle ), YASS � �.�. �� ��������� ��������� ��������. ������ ���� ���������.

�����:
 (http://spb-piksel.ru/tests/speed/)
 (http://spb-piksel.ru/tests/speed2/)

�������������:

    qsa.querySelectorAll( string selector [, node/nodeList context(s), nodeList extra(s) ] );
    qsa.querySelectorAll( "div + p > a" );
    qsa.querySelectorAll( "div + p > a", document.getElemetById("myNode") );
    qsa.querySelectorAll( "div + p > a", document.getElemetById("myNode"), [ elem1, elem2, elem3 ] );

    qsa.matchesSelector( Element node, String selector );
