const plugins = [
    ['@semantic-release/commit-analyzer', {
        preset: 'angular',
        releaseRules: [
            {type: 'refactor', release: 'patch'},
            {type: 'style', release: 'patch'},
            {type: 'ci', release: 'patch'},
            {type: 'build', scope: 'deps', release: 'patch'}
        ],
        parserOpts: {
            noteKeywords: ['BREAKING CHANGE', 'BREAKING CHANGES', 'BREAKING']
        }
    }],
    ['@semantic-release/release-notes-generator', {
        preset: 'angular',
        parserOpts: {
            noteKeywords: ['BREAKING CHANGE', 'BREAKING CHANGES', 'BREAKING']
        },
        writerOpts: {
            commitsSort: ['subject', 'scope']
        }
    }],
    '@semantic-release/changelog',
    ['@semantic-release/exec', {
        prepareCmd: 'VERSION=${nextRelease.version} BRANCH=${options.branch} ./.github/workflows/release-prepare.sh',
        successCmd: 'VERSION=${nextRelease.version} BRANCH=${options.branch} ./.github/workflows/release-success.sh'
    }],
    '@semantic-release/npm',
    '@semantic-release/github'
];

// eslint-disable-next-line node/no-process-env
if (process.env.BRANCH === 'main') {
    plugins.push(['@semantic-release/git', {
        'assets': ['CHANGELOG.md', 'package.json', 'package-lock.json'],
        'message': 'chore(release): :bookmark: ${nextRelease.version} [skip ci]\n\n${nextRelease.notes}'
    }]);
}

plugins.push(['@sebbo2002/semantic-release-docker', {
    images: [
        process.env.DOCKER_LOCAL_IMAGE_DH,
        process.env.DOCKER_LOCAL_IMAGE_GH
    ]
}]);

module.exports = {
    branches: [
        {
            name: 'main',
            channel: 'latest',
            prerelease: false
        },
        {
            name: 'develop',
            channel: 'next',
            prerelease: true
        }
    ],
    plugins
};
