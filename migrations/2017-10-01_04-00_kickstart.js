'use strict';

module.exports = {
    async up (q, models, sequelize, DataTypes) {
        await q.dropAllTables();

        // account
        const AccountLogic = require('../logic/account');
        await q.createTable('accounts', {
            id: {
                type: DataTypes.UUID,
                primaryKey: true,
                defaultValue: DataTypes.UUIDV4
            },
            name: {
                type: DataTypes.STRING,
                allowNull: false
            },
            type: {
                type: DataTypes.ENUM(AccountLogic.getValidTypeValues()),
                allowNull: false
            },
            hidden: {
                type: DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: false
            },
            pluginsOwnId: {
                type: DataTypes.STRING,
                allowNull: true
            },
            createdAt: {
                allowNull: false,
                type: DataTypes.DATE
            },
            updatedAt: {
                allowNull: false,
                type: DataTypes.DATE
            },
            documentId: {
                type: DataTypes.UUID,
                allowNull: false
            },
            pluginInstanceId: {
                type: DataTypes.UUID,
                allowNull: true
            }
        }, {
            charset: 'utf8mb4',
            collate: 'utf8mb4_general_ci'
        });

        // budget
        await q.createTable('budgets', {
            id: {
                type: DataTypes.UUID,
                primaryKey: true,
                defaultValue: DataTypes.UUIDV4
            },
            name: {
                type: DataTypes.STRING,
                allowNull: false
            },
            goal: {
                type: DataTypes.INTEGER,
                allowNull: true
            },
            hidden: {
                type: DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: false
            },
            pluginsOwnId: {
                type: DataTypes.STRING,
                allowNull: true
            },
            createdAt: {
                allowNull: false,
                type: DataTypes.DATE
            },
            updatedAt: {
                allowNull: false,
                type: DataTypes.DATE
            },
            pluginInstanceId: {
                type: DataTypes.UUID,
                allowNull: true
            },
            categoryId: {
                type: DataTypes.UUID,
                allowNull: false
            }
        }, {
            charset: 'utf8mb4',
            collate: 'utf8mb4_general_ci'
        });

        // category
        await q.createTable('categories', {
            id: {
                type: DataTypes.UUID,
                primaryKey: true,
                defaultValue: DataTypes.UUIDV4
            },
            name: {
                type: DataTypes.STRING,
                allowNull: false
            },
            createdAt: {
                allowNull: false,
                type: DataTypes.DATE
            },
            updatedAt: {
                allowNull: false,
                type: DataTypes.DATE
            },
            documentId: {
                type: DataTypes.UUID,
                allowNull: false
            }
        }, {
            charset: 'utf8mb4',
            collate: 'utf8mb4_general_ci'
        });

        // document
        await q.createTable('documents', {
            id: {
                type: DataTypes.UUID,
                primaryKey: true,
                defaultValue: DataTypes.UUIDV4
            },
            name: {
                type: DataTypes.STRING,
                allowNull: false
            },
            createdAt: {
                allowNull: false,
                type: DataTypes.DATE
            },
            updatedAt: {
                allowNull: false,
                type: DataTypes.DATE
            }
        }, {
            charset: 'utf8mb4',
            collate: 'utf8mb4_general_ci'
        });

        // learning
        await q.createTable('learnings', {
            id: {
                type: DataTypes.UUID,
                primaryKey: true,
                defaultValue: DataTypes.UUIDV4
            },
            location: {
                type: DataTypes.ENUM('payee.name', 'payee.account', 'reference'),
                allowNull: false
            },
            word: {
                type: DataTypes.STRING(50),
                allowNull: false
            },
            createdAt: {
                allowNull: false,
                type: DataTypes.DATE
            },
            updatedAt: {
                allowNull: false,
                type: DataTypes.DATE
            },
            documentId: {
                type: DataTypes.UUID,
                allowNull: false
            },
            categoryId: {
                type: DataTypes.UUID,
                allowNull: false
            }
        }, {
            charset: 'utf8mb4',
            collate: 'utf8mb4_general_ci'
        });

        // payee
        await q.createTable('payees', {
            id: {
                type: DataTypes.UUID,
                primaryKey: true,
                defaultValue: DataTypes.UUIDV4
            },
            name: {
                type: DataTypes.STRING,
                allowNull: false
            },
            createdAt: {
                allowNull: false,
                type: DataTypes.DATE
            },
            updatedAt: {
                allowNull: false,
                type: DataTypes.DATE
            },
            documentId: {
                type: DataTypes.UUID,
                allowNull: true
            }
        }, {
            charset: 'utf8mb4',
            collate: 'utf8mb4_general_ci'
        });

        // plugin-config
        await q.createTable('plugin-configs', {
            id: {
                type: DataTypes.UUID,
                primaryKey: true,
                defaultValue: DataTypes.UUIDV4
            },
            key: {
                type: DataTypes.STRING,
                allowNull: false
            },
            value: {
                type: DataTypes.STRING,
                allowNull: true
            },
            createdAt: {
                allowNull: false,
                type: DataTypes.DATE
            },
            updatedAt: {
                allowNull: false,
                type: DataTypes.DATE
            },
            pluginInstanceId: {
                type: DataTypes.UUID,
                allowNull: false
            }
        }, {
            charset: 'utf8mb4',
            collate: 'utf8mb4_general_ci'
        });

        // plugin-instance
        await q.createTable('plugin-instances', {
            id: {
                type: DataTypes.UUID,
                primaryKey: true,
                defaultValue: DataTypes.UUIDV4
            },
            type: {
                type: DataTypes.STRING,
                allowNull: false
            },
            createdAt: {
                allowNull: false,
                type: DataTypes.DATE
            },
            updatedAt: {
                allowNull: false,
                type: DataTypes.DATE
            },
            documentId: {
                type: DataTypes.UUID,
                allowNull: false
            }
        }, {
            charset: 'utf8mb4',
            collate: 'utf8mb4_general_ci'
        });

        // plugin-store
        await q.createTable('plugin-stores', {
            id: {
                type: DataTypes.UUID,
                primaryKey: true,
                defaultValue: DataTypes.UUIDV4
            },
            key: {
                type: DataTypes.STRING,
                allowNull: false
            },
            value: {
                type: DataTypes.TEXT,
                allowNull: true
            },
            createdAt: {
                allowNull: false,
                type: DataTypes.DATE
            },
            updatedAt: {
                allowNull: false,
                type: DataTypes.DATE
            },
            pluginInstanceId: {
                type: DataTypes.UUID,
                allowNull: false
            }
        }, {
            charset: 'utf8mb4',
            collate: 'utf8mb4_general_ci'
        });

        // portion
        await q.createTable('portions', {
            id: {
                type: DataTypes.UUID,
                primaryKey: true,
                defaultValue: DataTypes.UUIDV4
            },
            month: {
                type: DataTypes.STRING(7),
                allowNull: false
            },
            budgeted: {
                type: DataTypes.INTEGER,
                allowNull: true
            },
            outflow: {
                type: DataTypes.INTEGER,
                allowNull: false
            },
            balance: {
                type: DataTypes.INTEGER,
                allowNull: false
            },
            createdAt: {
                allowNull: false,
                type: DataTypes.DATE
            },
            updatedAt: {
                allowNull: false,
                type: DataTypes.DATE
            },
            budgetId: {
                type: DataTypes.UUID,
                allowNull: false
            }
        }, {
            charset: 'utf8mb4',
            collate: 'utf8mb4_general_ci'
        });

        // sessions
        await q.createTable('sessions', {
            id: {
                type: DataTypes.UUID,
                primaryKey: true,
                defaultValue: DataTypes.UUIDV4
            },
            name: {
                type: DataTypes.STRING,
                allowNull: false
            },
            url: {
                type: DataTypes.STRING,
                allowNull: true
            },
            secret: {
                type: DataTypes.STRING,
                allowNull: false
            },
            mobilePairing: {
                type: DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: false
            },
            createdAt: {
                allowNull: false,
                type: DataTypes.DATE
            },
            updatedAt: {
                allowNull: false,
                type: DataTypes.DATE
            },
            userId: {
                type: DataTypes.UUID,
                allowNull: false
            }
        }, {
            charset: 'utf8mb4',
            collate: 'utf8mb4_general_ci'
        });

        // settings
        await q.createTable('settings', {
            id: {
                type: DataTypes.UUID,
                primaryKey: true,
                defaultValue: DataTypes.UUIDV4
            },
            key: {
                type: DataTypes.STRING,
                allowNull: false
            },
            value: {
                type: DataTypes.STRING,
                allowNull: true
            },
            createdAt: {
                allowNull: false,
                type: DataTypes.DATE
            },
            updatedAt: {
                allowNull: false,
                type: DataTypes.DATE
            },
            documentId: {
                type: DataTypes.UUID,
                allowNull: true,
                defaultValue: null
            }
        }, {
            charset: 'utf8mb4',
            collate: 'utf8mb4_general_ci'
        });

        // shares
        await q.createTable('shares', {
            id: {
                type: DataTypes.UUID,
                primaryKey: true,
                defaultValue: DataTypes.UUIDV4
            },
            createdAt: {
                allowNull: false,
                type: DataTypes.DATE
            },
            updatedAt: {
                allowNull: false,
                type: DataTypes.DATE
            },
            documentId: {
                type: DataTypes.UUID,
                allowNull: false
            },
            userId: {
                type: DataTypes.UUID,
                allowNull: false
            }
        }, {
            charset: 'utf8mb4',
            collate: 'utf8mb4_general_ci'
        });

        // summaries
        await q.createTable('summaries', {
            id: {
                type: DataTypes.UUID,
                primaryKey: true,
                defaultValue: DataTypes.UUIDV4
            },
            month: {
                type: DataTypes.STRING(7),
                allowNull: false
            },
            available: {
                type: DataTypes.INTEGER,
                allowNull: false
            },
            availableLastMonth: {
                type: DataTypes.INTEGER,
                allowNull: false
            },
            income: {
                type: DataTypes.INTEGER,
                allowNull: false
            },
            budgeted: {
                type: DataTypes.INTEGER,
                allowNull: false
            },
            outflow: {
                type: DataTypes.INTEGER,
                allowNull: false
            },
            balance: {
                type: DataTypes.INTEGER,
                allowNull: false
            },
            createdAt: {
                allowNull: false,
                type: DataTypes.DATE
            },
            updatedAt: {
                allowNull: false,
                type: DataTypes.DATE
            },
            documentId: {
                type: DataTypes.UUID,
                allowNull: false
            }
        }, {
            charset: 'utf8mb4',
            collate: 'utf8mb4_general_ci'
        });

        // transactions
        await q.createTable('transactions', {
            id: {
                type: DataTypes.UUID,
                primaryKey: true,
                defaultValue: DataTypes.UUIDV4
            },
            time: {
                type: DataTypes.DATE,
                allowNull: false
            },
            pluginsOwnPayeeId: {
                type: DataTypes.STRING,
                allowNull: true
            },
            approved: {
                type: DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: false
            },
            memo: {
                type: DataTypes.STRING(512),
                allowNull: true
            },
            pluginsOwnMemo: {
                type: DataTypes.STRING(512),
                allowNull: true
            },
            amount: {
                type: DataTypes.INTEGER,
                allowNull: false
            },
            status: {
                type: DataTypes.ENUM('pending', 'normal', 'cleared'),
                allowNull: false
            },
            locationLatitude: {
                type: DataTypes.DOUBLE,
                allowNull: true
            },
            locationLongitude: {
                type: DataTypes.DOUBLE,
                allowNull: true
            },
            locationAccuracy: {
                type: DataTypes.INTEGER,
                allowNull: true
            },
            pluginsOwnId: {
                type: DataTypes.STRING,
                allowNull: true
            },
            isReconciling: {
                type: DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: false
            },
            createdAt: {
                allowNull: false,
                type: DataTypes.DATE
            },
            updatedAt: {
                allowNull: false,
                type: DataTypes.DATE
            },
            accountId: {
                type: DataTypes.UUID,
                allowNull: false
            },
            payeeId: {
                type: DataTypes.UUID,
                allowNull: true,
                defaultValue: null
            }
        }, {
            charset: 'utf8mb4',
            collate: 'utf8mb4_general_ci'
        });

        // units
        await q.createTable('units', {
            id: {
                type: DataTypes.UUID,
                primaryKey: true,
                defaultValue: DataTypes.UUIDV4
            },
            amount: {
                type: DataTypes.INTEGER,
                allowNull: false
            },
            type: {
                type: DataTypes.ENUM('INCOME', 'INCOME_NEXT', 'BUDGET', 'TRANSFER'),
                allowNull: true
            },
            memo: {
                type: DataTypes.STRING(512),
                allowNull: true
            },
            createdAt: {
                allowNull: false,
                type: DataTypes.DATE
            },
            updatedAt: {
                allowNull: false,
                type: DataTypes.DATE
            },
            budgetId: {
                type: DataTypes.UUID,
                allowNull: true
            },
            transactionId: {
                type: DataTypes.UUID,
                allowNull: false
            },
            transferAccountId: {
                type: DataTypes.UUID,
                allowNull: true
            }
        }, {
            charset: 'utf8mb4',
            collate: 'utf8mb4_general_ci'
        });

        // users
        await q.createTable('users', {
            id: {
                type: DataTypes.UUID,
                primaryKey: true,
                defaultValue: DataTypes.UUIDV4
            },
            email: {
                type: DataTypes.STRING,
                allowNull: false,
                unique: true
            },
            password: {
                type: DataTypes.STRING,
                allowNull: false
            },
            isAdmin: {
                type: DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: false
            },
            needsPasswordChange: {
                type: DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: false
            },
            otpKey: {
                type: DataTypes.STRING,
                allowNull: true
            },
            otpEnabled: {
                type: DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: false
            },
            createdAt: {
                allowNull: false,
                type: DataTypes.DATE
            },
            updatedAt: {
                allowNull: false,
                type: DataTypes.DATE
            }
        }, {
            charset: 'utf8mb4',
            collate: 'utf8mb4_general_ci'
        });


        // accounts
        await q.addConstraint('accounts', {
            type: 'FOREIGN KEY',
            name: 'accounts_ibfk_1',
            fields: ['documentId'],
            references: {
                table: 'documents',
                field: 'id'
            },
            onDelete: 'cascade',
            onUpdate: 'cascade'
        });
        await q.addConstraint('accounts', {
            type: 'FOREIGN KEY',
            name: 'accounts_ibfk_2',
            fields: ['pluginInstanceId'],
            references: {
                table: 'plugin-instances',
                field: 'id'
            },
            onDelete: 'set null',
            onUpdate: 'set null'
        });

        // budgets
        await q.addConstraint('budgets', {
            type: 'FOREIGN KEY',
            name: 'budgets_ibfk_1',
            fields: ['pluginInstanceId'],
            references: {
                table: 'plugin-instances',
                field: 'id'
            },
            onDelete: 'set null',
            onUpdate: 'set null'
        });
        await q.addConstraint('budgets', {
            type: 'FOREIGN KEY',
            name: 'budgets_ibfk_2',
            fields: ['categoryId'],
            references: {
                table: 'categories',
                field: 'id'
            },
            onDelete: 'cascade',
            onUpdate: 'cascade'
        });

        // categories
        await q.addConstraint('categories', {
            type: 'FOREIGN KEY',
            name: 'categories_ibfk_1',
            fields: ['documentId'],
            references: {
                table: 'documents',
                field: 'id'
            },
            onDelete: 'cascade',
            onUpdate: 'cascade'
        });

        // learnings
        await q.addConstraint('learnings', {
            type: 'FOREIGN KEY',
            name: 'learnings_ibfk_1',
            fields: ['documentId'],
            references: {
                table: 'documents',
                field: 'id'
            },
            onDelete: 'cascade',
            onUpdate: 'cascade'
        });
        await q.addConstraint('learnings', {
            type: 'FOREIGN KEY',
            name: 'learnings_ibfk_2',
            fields: ['categoryId'],
            references: {
                table: 'categories',
                field: 'id'
            },
            onDelete: 'cascade',
            onUpdate: 'cascade'
        });

        // payees
        await q.addConstraint('payees', {
            type: 'FOREIGN KEY',
            name: 'payees_ibfk_1',
            fields: ['documentId'],
            references: {
                table: 'documents',
                field: 'id'
            },
            onDelete: 'cascade',
            onUpdate: 'cascade'
        });

        // plugin-configs
        await q.addConstraint('plugin-configs', {
            type: 'FOREIGN KEY',
            name: 'plugin-config_ibfk_1',
            fields: ['pluginInstanceId'],
            references: {
                table: 'plugin-instances',
                field: 'id'
            },
            onDelete: 'cascade',
            onUpdate: 'cascade'
        });

        // plugin-instances
        await q.addConstraint('plugin-instances', {
            type: 'FOREIGN KEY',
            name: 'plugin-instances_ibfk_1',
            fields: ['documentId'],
            references: {
                table: 'documents',
                field: 'id'
            },
            onDelete: 'cascade',
            onUpdate: 'cascade'
        });

        // plugin-stores
        await q.addConstraint('plugin-stores', {
            type: 'FOREIGN KEY',
            name: 'plugin-store_ibfk_1',
            fields: ['pluginInstanceId'],
            references: {
                table: 'plugin-instances',
                field: 'id'
            },
            onDelete: 'cascade',
            onUpdate: 'cascade'
        });

        // portions
        await q.addConstraint('portions', {
            type: 'FOREIGN KEY',
            name: 'portions_ibfk_1',
            fields: ['budgetId'],
            references: {
                table: 'budgets',
                field: 'id'
            },
            onDelete: 'cascade',
            onUpdate: 'cascade'
        });

        // sessions
        await q.addConstraint('sessions', {
            type: 'FOREIGN KEY',
            name: 'sessions_ibfk_1',
            fields: ['userId'],
            references: {
                table: 'users',
                field: 'id'
            },
            onDelete: 'cascade',
            onUpdate: 'cascade'
        });

        // settings
        await q.addConstraint('settings', {
            type: 'FOREIGN KEY',
            name: 'settings_ibfk_1',
            fields: ['documentId'],
            references: {
                table: 'documents',
                field: 'id'
            },
            onDelete: 'cascade',
            onUpdate: 'cascade'
        });
        await q.addIndex('settings', ['documentId', 'key'], {
            unique: true,
            name: 'settings_document_id_key'
        });

        // shares
        await q.addConstraint('shares', {
            type: 'FOREIGN KEY',
            name: 'shares_ibfk_1',
            fields: ['userId'],
            references: {
                table: 'users',
                field: 'id'
            },
            onDelete: 'cascade',
            onUpdate: 'cascade'
        });
        await q.addConstraint('shares', {
            type: 'FOREIGN KEY',
            name: 'shares_ibfk_2',
            fields: ['documentId'],
            references: {
                table: 'documents',
                field: 'id'
            },
            onDelete: 'cascade',
            onUpdate: 'cascade'
        });
        await q.addIndex('shares', ['userId', 'documentId'], {
            unique: true,
            name: 'shares_documentId_userId_unique'
        });

        // summaries
        await q.addConstraint('summaries', {
            type: 'FOREIGN KEY',
            name: 'summaries_ibfk_1',
            fields: ['documentId'],
            references: {
                table: 'documents',
                field: 'id'
            },
            onDelete: 'cascade',
            onUpdate: 'cascade'
        });

        // transactions
        await q.addConstraint('transactions', {
            type: 'FOREIGN KEY',
            name: 'transactions_ibfk_1',
            fields: ['accountId'],
            references: {
                table: 'accounts',
                field: 'id'
            },
            onDelete: 'cascade',
            onUpdate: 'cascade'
        });
        await q.addConstraint('transactions', {
            type: 'FOREIGN KEY',
            name: 'transactions_ibfk_2',
            fields: ['payeeId'],
            references: {
                table: 'payees',
                field: 'id'
            },
            onDelete: 'cascade',
            onUpdate: 'cascade'
        });

        // units
        await q.addConstraint('units', {
            type: 'FOREIGN KEY',
            name: 'units_ibfk_1',
            fields: ['transactionId'],
            references: {
                table: 'transactions',
                field: 'id'
            },
            onDelete: 'cascade',
            onUpdate: 'cascade'
        });
        await q.addConstraint('units', {
            type: 'FOREIGN KEY',
            name: 'units_ibfk_2',
            fields: ['budgetId'],
            references: {
                table: 'budgets',
                field: 'id'
            },
            onDelete: 'cascade',
            onUpdate: 'cascade'
        });
        await q.addConstraint('units', {
            type: 'FOREIGN KEY',
            name: 'unit_ibfk_3',
            fields: ['transferAccountId'],
            references: {
                table: 'accounts',
                field: 'id'
            },
            onDelete: 'cascade',
            onUpdate: 'cascade'
        });
    },
    async down (q) {
        await q.dropAllTables();
    }
};
