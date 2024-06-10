function compareSchemas() {
    const text = document.getElementById("schemaText").value;
    const result = parseSchemas(text);
    if (result) {
        displayResult(result);
    }
}

function parseSchemas(text) {
    const oldSchemaMatch = text.match(/Previous: StructType\(\[(.*)\]\)/s);
    const newSchemaMatch = text.match(/StructType\(\[(.*)\]\) \| Previous:/s);

    if (!oldSchemaMatch || !newSchemaMatch) {
        alert("Invalid input. Please ensure the text contains both old and new schema definitions.");
        return null;
    }

    const oldSchema = parseFields(oldSchemaMatch[1]);
    const newSchema = parseFields(newSchemaMatch[1]);

    console.log('New Schema:', newSchema);
    console.log('Old Schema:', oldSchema);

    const added = findDifferences(newSchema, oldSchema);
    const removed = findDifferences(oldSchema, newSchema);
    const modified = findModifiedFields(oldSchema, newSchema);

    return { added, removed, modified };
}

function parseFields(fieldsText) {
    const fields = [];
    const regex = /StructField\('(\w+)',\s*([^,]+),\s*(True|False)\)/gs;
    let match;

    while ((match = regex.exec(fieldsText)) !== null) {
        const [_, name, type, nullable] = match;

        if (type.startsWith('StructType')) {
            const nestedFieldsMatch = type.match(/StructType\(\[(.*)\]\)/s);
            fields.push({
                name: name,
                type: 'StructType',
                nullable: nullable === 'True',
                nested: nestedFieldsMatch ? parseFields(nestedFieldsMatch[1]) : []
            });
        } else {
            fields.push({
                name: name,
                type: type,
                nullable: nullable === 'True'
            });
        }
    }

    return fields;
}

function findDifferences(schema1, schema2) {
    const differences = [];

    schema1.forEach(field => {
        const matchingField = schema2.find(f => f.name === field.name);
        if (!matchingField) {
            differences.push(field);
        } else if (field.nested) {
            const nestedDifferences = findDifferences(field.nested, matchingField.nested || []);
            nestedDifferences.forEach(nestedField => {
                differences.push({
                    name: `${field.name}.${nestedField.name}`,
                    type: nestedField.type,
                    nullable: nestedField.nullable,
                    nested: nestedField.nested
                });
            });
        }
    });

    return differences;
}

function findModifiedFields(oldSchema, newSchema) {
    const modified = [];

    newSchema.forEach(field => {
        const oldField = oldSchema.find(f => f.name === field.name);
        if (oldField && JSON.stringify(oldField) !== JSON.stringify(field)) {
            if (field.nested) {
                const nestedModified = findModifiedFields(oldField.nested || [], field.nested);
                nestedModified.forEach(nestedField => {
                    modified.push({
                        name: `${field.name}.${nestedField.name}`,
                        type: nestedField.type,
                        nullable: nestedField.nullable,
                        nested: nestedField.nested
                    });
                });
            } else {
                modified.push(field);
            }
        }
    });

    return modified;
}

function displayResult(result) {
    document.getElementById("result").style.display = "block";

    const addedTable = document.getElementById("addedTable");
    const removedTable = document.getElementById("removedTable");
    const modifiedTable = document.getElementById("modifiedTable");

    populateTable(addedTable, result.added);
    populateTable(removedTable, result.removed);
    populateTable(modifiedTable, result.modified);
}

function populateTable(table, data) {
    table.innerHTML = `
        <tr>
            <th>Name</th>
            <th>Type</th>
            <th>Nullable</th>
            <th>Nested Fields</th>
        </tr>
    `;

    data.forEach(field => {
        const row = table.insertRow();
        row.insertCell(0).textContent = field.name;
        row.insertCell(1).textContent = field.type;
        row.insertCell(2).textContent = field.nullable;
        row.insertCell(3).textContent = field.nested ? JSON.stringify(field.nested) : 'None';
    });
}
