const assert = require('assert');
const DatabaseHelper = require('../helpers/database');

describe('Migrations', function() {
    it('should run without errors', async function() {
        await DatabaseHelper.reset();
        await DatabaseHelper.getMigrator().up();
        assert.ok(true);
    });
});
