# Unit converter

A tiny MCP server that converts between units so the assistant stops doing arithmetic in its head.

## Convert
Given a number, a "from" unit and a "to" unit, return the converted number and the unit it is in. Supported units:
- lengths: m, km, mi, ft
- weights: kg, lb
- temperatures: c, f

Converting between different kinds of unit (for example km to kg) is an error: "Cannot convert <from> to <to>". An unknown unit is also an error.

## List units
Return every supported unit, grouped by kind (length, weight, temperature).
