(async () => {

    // https://github.com/semantic-release/semantic-release/issues/753#issuecomment-550977000
    const { default: semanticRelease } = await import('semantic-release');
    const result = await semanticRelease({dryRun: true});


    if (result) {
        const {writeFileSync} = require('fs');
        writeFileSync('./version', result.nextRelease.version);
        writeFileSync('./artifact/release.json', JSON.stringify(result.nextRelease, null, '  '));
    } else {
        process.exit(1);
    }
})();
