<?xml version="1.0" encoding="utf-8"?>
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform" 
xmlns:fm="http://www.filemaker.com/fmpxmlresult" exclude-result-prefixes="fm" >
	<xsl:output method="html" version="1.0" encoding="utf-8" indent="yes"/>
	<xsl:template match="/">
		<xsl:value-of select="fm:FMPXMLRESULT/fm:RESULTSET/fm:ROW/fm:COL/fm:DATA" disable-output-escaping="yes"/>
	</xsl:template>
</xsl:stylesheet>