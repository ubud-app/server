'use strict';

module.exports = {
    async up (q) {

        // accounts
        await q.query(
            'CREATE TABLE `accounts` (\n' +
            '  `id` char(36) CHARACTER SET utf8 COLLATE utf8_bin NOT NULL,\n' +
            '  `name` varchar(255) NOT NULL,\n' +
            '  `type` enum(\'checking\',\'savings\',\'creditCard\',\'cash\',\'paypal\',\'mortgage\',\'asset\',\'loan\') NOT NULL,\n' +
            '  `number` varchar(255) DEFAULT NULL,\n' +
            '  `hidden` tinyint(1) NOT NULL DEFAULT 0,\n' +
            '  `createdAt` datetime NOT NULL,\n' +
            '  `updatedAt` datetime NOT NULL,\n' +
            '  `documentId` char(36) CHARACTER SET utf8 COLLATE utf8_bin NOT NULL,\n' +
            '  `pluginId` char(36) CHARACTER SET utf8 COLLATE utf8_bin DEFAULT NULL,\n' +
            '  PRIMARY KEY (`id`),\n' +
            '  KEY `documentId` (`documentId`),\n' +
            '  KEY `pluginId` (`pluginId`),\n' +
            '  CONSTRAINT `accounts_ibfk_1` FOREIGN KEY (`documentId`) REFERENCES `documents` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,\n' +
            '  CONSTRAINT `accounts_ibfk_2` FOREIGN KEY (`pluginId`) REFERENCES `plugins` (`id`) ON DELETE CASCADE ON UPDATE CASCADE\n' +
            ') ENGINE=InnoDB DEFAULT CHARSET=utf8;'
        );

        // budgets
        await q.query(
            'CREATE TABLE `budgets` (\n' +
            '  `id` char(36) CHARACTER SET utf8 COLLATE utf8_bin NOT NULL,\n' +
            '  `name` varchar(255) NOT NULL,\n' +
            '  `goal` int(11) DEFAULT NULL,\n' +
            '  `hidden` tinyint(1) NOT NULL DEFAULT 0,\n' +
            '  `createdAt` datetime NOT NULL,\n' +
            '  `updatedAt` datetime NOT NULL,\n' +
            '  `pluginId` char(36) CHARACTER SET utf8 COLLATE utf8_bin DEFAULT NULL,\n' +
            '  `categoryId` char(36) CHARACTER SET utf8 COLLATE utf8_bin NOT NULL,\n' +
            '  PRIMARY KEY (`id`),\n' +
            '  KEY `pluginId` (`pluginId`),\n' +
            '  KEY `categoryId` (`categoryId`),\n' +
            '  CONSTRAINT `budgets_ibfk_1` FOREIGN KEY (`pluginId`) REFERENCES `plugins` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,\n' +
            '  CONSTRAINT `budgets_ibfk_2` FOREIGN KEY (`categoryId`) REFERENCES `categories` (`id`) ON DELETE CASCADE ON UPDATE CASCADE\n' +
            ') ENGINE=InnoDB DEFAULT CHARSET=utf8;'
        );

        // categories
        await q.query(
            'CREATE TABLE `categories` (\n' +
            '  `id` char(36) CHARACTER SET utf8 COLLATE utf8_bin NOT NULL,\n' +
            '  `name` varchar(255) NOT NULL,\n' +
            '  `createdAt` datetime NOT NULL,\n' +
            '  `updatedAt` datetime NOT NULL,\n' +
            '  `documentId` char(36) CHARACTER SET utf8 COLLATE utf8_bin NOT NULL,\n' +
            '  PRIMARY KEY (`id`),\n' +
            '  KEY `documentId` (`documentId`),\n' +
            '  CONSTRAINT `categories_ibfk_1` FOREIGN KEY (`documentId`) REFERENCES `documents` (`id`) ON DELETE CASCADE ON UPDATE CASCADE\n' +
            ') ENGINE=InnoDB DEFAULT CHARSET=utf8;'
        );

        // documents
        await q.query(
            'CREATE TABLE `documents` (\n' +
            '  `id` char(36) CHARACTER SET utf8 COLLATE utf8_bin NOT NULL,\n' +
            '  `name` varchar(255) NOT NULL,\n' +
            '  `createdAt` datetime NOT NULL,\n' +
            '  `updatedAt` datetime NOT NULL,\n' +
            '  PRIMARY KEY (`id`)\n' +
            ') ENGINE=InnoDB DEFAULT CHARSET=utf8;'
        );

        // learnings
        await q.query(
            'CREATE TABLE `learnings` (\n' +
            '  `id` char(36) CHARACTER SET utf8 COLLATE utf8_bin NOT NULL,\n' +
            '  `location` enum(\'payee.name\',\'payee.account\',\'reference\') NOT NULL,\n' +
            '  `word` varchar(50) NOT NULL,\n' +
            '  `createdAt` datetime NOT NULL,\n' +
            '  `updatedAt` datetime NOT NULL,\n' +
            '  `documentId` char(36) CHARACTER SET utf8 COLLATE utf8_bin NOT NULL,\n' +
            '  `categoryId` char(36) CHARACTER SET utf8 COLLATE utf8_bin NOT NULL,\n' +
            '  PRIMARY KEY (`id`),\n' +
            '  KEY `documentId` (`documentId`),\n' +
            '  KEY `categoryId` (`categoryId`),\n' +
            '  CONSTRAINT `learnings_ibfk_1` FOREIGN KEY (`documentId`) REFERENCES `documents` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,\n' +
            '  CONSTRAINT `learnings_ibfk_2` FOREIGN KEY (`categoryId`) REFERENCES `categories` (`id`) ON DELETE CASCADE ON UPDATE CASCADE\n' +
            ') ENGINE=InnoDB DEFAULT CHARSET=utf8;'
        );

        // payees
        await q.query(
            'CREATE TABLE `payees` (\n' +
            '  `id` char(36) CHARACTER SET utf8 COLLATE utf8_bin NOT NULL,\n' +
            '  `name` varchar(255) NOT NULL,\n' +
            '  `createdAt` datetime NOT NULL,\n' +
            '  `updatedAt` datetime NOT NULL,\n' +
            '  `documentId` char(36) CHARACTER SET utf8 COLLATE utf8_bin DEFAULT NULL,\n' +
            '  PRIMARY KEY (`id`),\n' +
            '  KEY `documentId` (`documentId`),\n' +
            '  CONSTRAINT `payees_ibfk_1` FOREIGN KEY (`documentId`) REFERENCES `documents` (`id`) ON DELETE CASCADE ON UPDATE CASCADE\n' +
            ') ENGINE=InnoDB DEFAULT CHARSET=utf8;'
        );

        // plugins
        await q.query(
            'CREATE TABLE `plugins` (\n' +
            '  `id` char(36) CHARACTER SET utf8 COLLATE utf8_bin NOT NULL,\n' +
            '  `type` varchar(255) NOT NULL,\n' +
            '  `createdAt` datetime NOT NULL,\n' +
            '  `updatedAt` datetime NOT NULL,\n' +
            '  `documentId` char(36) CHARACTER SET utf8 COLLATE utf8_bin NOT NULL,\n' +
            '  PRIMARY KEY (`id`),\n' +
            '  KEY `documentId` (`documentId`),\n' +
            '  CONSTRAINT `plugins_ibfk_1` FOREIGN KEY (`documentId`) REFERENCES `documents` (`id`) ON DELETE CASCADE ON UPDATE CASCADE\n' +
            ') ENGINE=InnoDB DEFAULT CHARSET=utf8;'
        );

        // portions
        await q.query(
            'CREATE TABLE `portions` (\n' +
            '  `id` char(36) CHARACTER SET utf8 COLLATE utf8_bin NOT NULL,\n' +
            '  `month` varchar(7) NOT NULL,\n' +
            '  `budgeted` int(11) DEFAULT NULL,\n' +
            '  `outflow` int(11) NOT NULL,\n' +
            '  `balance` int(11) NOT NULL,\n' +
            '  `createdAt` datetime NOT NULL,\n' +
            '  `updatedAt` datetime NOT NULL,\n' +
            '  `budgetId` char(36) CHARACTER SET utf8 COLLATE utf8_bin NOT NULL,\n' +
            '  PRIMARY KEY (`id`),\n' +
            '  KEY `budgetId` (`budgetId`),\n' +
            '  CONSTRAINT `portions_ibfk_1` FOREIGN KEY (`budgetId`) REFERENCES `budgets` (`id`) ON DELETE CASCADE ON UPDATE CASCADE\n' +
            ') ENGINE=InnoDB DEFAULT CHARSET=utf8;'
        );

        // sessions
        await q.query(
            'CREATE TABLE `sessions` (\n' +
            '  `id` char(36) CHARACTER SET utf8 COLLATE utf8_bin NOT NULL,\n' +
            '  `name` varchar(255) NOT NULL,\n' +
            '  `url` varchar(255) DEFAULT NULL,\n' +
            '  `secret` varchar(255) NOT NULL,\n' +
            '  `createdAt` datetime NOT NULL,\n' +
            '  `updatedAt` datetime NOT NULL,\n' +
            '  `userId` char(36) CHARACTER SET utf8 COLLATE utf8_bin NOT NULL,\n' +
            '  PRIMARY KEY (`id`),\n' +
            '  KEY `userId` (`userId`),\n' +
            '  CONSTRAINT `sessions_ibfk_1` FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE\n' +
            ') ENGINE=InnoDB DEFAULT CHARSET=utf8;'
        );

        // settings
        await q.query(
            'CREATE TABLE `settings` (\n' +
            '  `id` char(36) CHARACTER SET utf8 COLLATE utf8_bin NOT NULL,\n' +
            '  `key` varchar(255) NOT NULL,\n' +
            '  `value` varchar(255) DEFAULT NULL,\n' +
            '  `createdAt` datetime NOT NULL,\n' +
            '  `updatedAt` datetime NOT NULL,\n' +
            '  `documentId` char(36) CHARACTER SET utf8 COLLATE utf8_bin DEFAULT \'\',\n' +
            '  PRIMARY KEY (`id`),\n' +
            '  UNIQUE KEY `settings_document_id_key` (`documentId`,`key`),\n' +
            '  CONSTRAINT `settings_ibfk_1` FOREIGN KEY (`documentId`) REFERENCES `documents` (`id`) ON DELETE CASCADE ON UPDATE CASCADE\n' +
            ') ENGINE=InnoDB DEFAULT CHARSET=utf8;'
        );

        // shares
        await q.query(
            'CREATE TABLE `shares` (\n' +
            '  `id` char(36) CHARACTER SET utf8 COLLATE utf8_bin NOT NULL,\n' +
            '  `createdAt` datetime NOT NULL,\n' +
            '  `updatedAt` datetime NOT NULL,\n' +
            '  `userId` char(36) CHARACTER SET utf8 COLLATE utf8_bin DEFAULT NULL,\n' +
            '  `documentId` char(36) CHARACTER SET utf8 COLLATE utf8_bin DEFAULT NULL,\n' +
            '  PRIMARY KEY (`id`),\n' +
            '  UNIQUE KEY `shares_documentId_userId_unique` (`userId`,`documentId`),\n' +
            '  KEY `documentId` (`documentId`),\n' +
            '  CONSTRAINT `shares_ibfk_1` FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,\n' +
            '  CONSTRAINT `shares_ibfk_2` FOREIGN KEY (`documentId`) REFERENCES `documents` (`id`) ON DELETE CASCADE ON UPDATE CASCADE\n' +
            ') ENGINE=InnoDB DEFAULT CHARSET=utf8;'
        );

        // summaries
        await q.query(
            'CREATE TABLE `summaries` (\n' +
            '  `id` char(36) CHARACTER SET utf8 COLLATE utf8_bin NOT NULL,\n' +
            '  `month` varchar(7) NOT NULL,\n' +
            '  `available` int(11) NOT NULL,\n' +
            '  `availableLastMonth` int(11) NOT NULL,\n' +
            '  `income` int(11) NOT NULL,\n' +
            '  `budgeted` int(11) NOT NULL,\n' +
            '  `outflow` int(11) NOT NULL,\n' +
            '  `balance` int(11) NOT NULL,\n' +
            '  `createdAt` datetime NOT NULL,\n' +
            '  `updatedAt` datetime NOT NULL,\n' +
            '  `documentId` char(36) CHARACTER SET utf8 COLLATE utf8_bin NOT NULL,\n' +
            '  PRIMARY KEY (`id`),\n' +
            '  KEY `documentId` (`documentId`),\n' +
            '  CONSTRAINT `summaries_ibfk_1` FOREIGN KEY (`documentId`) REFERENCES `documents` (`id`) ON DELETE CASCADE ON UPDATE CASCADE\n' +
            ') ENGINE=InnoDB DEFAULT CHARSET=utf8;'
        );

        // transactions
        await q.query(
            'CREATE TABLE `transactions` (\n' +
            '  `id` char(36) CHARACTER SET utf8 COLLATE utf8_bin NOT NULL,\n' +
            '  `time` datetime NOT NULL,\n' +
            '  `payeePluginId` varchar(255) DEFAULT NULL,\n' +
            '  `approved` tinyint(1) NOT NULL DEFAULT 0,\n' +
            '  `memo` varchar(512) DEFAULT NULL,\n' +
            '  `amount` int(11) NOT NULL,\n' +
            '  `status` enum(\'pending\',\'normal\',\'cleared\') NOT NULL,\n' +
            '  `locationLatitude` double DEFAULT NULL,\n' +
            '  `locationLongitude` double DEFAULT NULL,\n' +
            '  `locationAccuracy` int(11) DEFAULT NULL,\n' +
            '  `createdAt` datetime NOT NULL,\n' +
            '  `updatedAt` datetime NOT NULL,\n' +
            '  `accountId` char(36) CHARACTER SET utf8 COLLATE utf8_bin NOT NULL,\n' +
            '  `payeeId` char(36) CHARACTER SET utf8 COLLATE utf8_bin DEFAULT NULL,\n' +
            '  PRIMARY KEY (`id`),\n' +
            '  KEY `accountId` (`accountId`),\n' +
            '  KEY `payeeId` (`payeeId`),\n' +
            '  CONSTRAINT `transactions_ibfk_1` FOREIGN KEY (`accountId`) REFERENCES `accounts` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,\n' +
            '  CONSTRAINT `transactions_ibfk_2` FOREIGN KEY (`payeeId`) REFERENCES `payees` (`id`) ON DELETE CASCADE ON UPDATE CASCADE\n' +
            ') ENGINE=InnoDB DEFAULT CHARSET=utf8;'
        );

        // units
        await q.query(
            'CREATE TABLE `units` (\n' +
            '  `id` char(36) CHARACTER SET utf8 COLLATE utf8_bin NOT NULL,\n' +
            '  `amount` int(11) NOT NULL,\n' +
            '  `memo` varchar(512) DEFAULT NULL,\n' +
            '  `incomeMonth` enum(\'this\',\'next\') DEFAULT NULL,\n' +
            '  `createdAt` datetime NOT NULL,\n' +
            '  `updatedAt` datetime NOT NULL,\n' +
            '  `transactionId` char(36) CHARACTER SET utf8 COLLATE utf8_bin NOT NULL,\n' +
            '  `budgetId` char(36) CHARACTER SET utf8 COLLATE utf8_bin DEFAULT NULL,\n' +
            '  PRIMARY KEY (`id`),\n' +
            '  KEY `transactionId` (`transactionId`),\n' +
            '  KEY `budgetId` (`budgetId`),\n' +
            '  CONSTRAINT `units_ibfk_1` FOREIGN KEY (`transactionId`) REFERENCES `transactions` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,\n' +
            '  CONSTRAINT `units_ibfk_2` FOREIGN KEY (`budgetId`) REFERENCES `budgets` (`id`) ON DELETE CASCADE ON UPDATE CASCADE\n' +
            ') ENGINE=InnoDB DEFAULT CHARSET=utf8;'
        );

        // users
        await q.query(
            'CREATE TABLE `users` (\n' +
            '  `id` char(36) CHARACTER SET utf8 COLLATE utf8_bin NOT NULL,\n' +
            '  `email` varchar(255) NOT NULL,\n' +
            '  `password` varchar(255) NOT NULL,\n' +
            '  `isAdmin` tinyint(1) NOT NULL DEFAULT 0,\n' +
            '  `needsPasswordChange` tinyint(1) NOT NULL DEFAULT 0,\n' +
            '  `otpKey` varchar(255) DEFAULT NULL,\n' +
            '  `otpEnabled` tinyint(1) NOT NULL DEFAULT 0,\n' +
            '  `createdAt` datetime NOT NULL,\n' +
            '  `updatedAt` datetime NOT NULL,\n' +
            '  PRIMARY KEY (`id`),\n' +
            '  UNIQUE KEY `email` (`email`),\n' +
            '  UNIQUE KEY `users_email_unique` (`email`)\n' +
            ') ENGINE=InnoDB DEFAULT CHARSET=utf8;'
        );
    },
    async down (q) {
        await q.dropTable('accounts', {});
        await q.dropTable('budgets', {});
        await q.dropTable('categories', {});
        await q.dropTable('documents', {});
        await q.dropTable('learnings', {});
        await q.dropTable('payees', {});
        await q.dropTable('plugins', {});
        await q.dropTable('portions', {});
        await q.dropTable('sessions', {});
        await q.dropTable('settings', {});
        await q.dropTable('shares', {});
        await q.dropTable('summaries', {});
        await q.dropTable('transactions', {});
        await q.dropTable('units', {});
        await q.dropTable('users', {});
    }
};
