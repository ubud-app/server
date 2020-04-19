'use strict';

const BaseLogic = require('./_');
const ErrorResponse = require('../helpers/errorResponse');

class BudgetGuessLogic extends BaseLogic {
    static getModelName () {
        return 'budget-guess';
    }

    static getPluralModelName () {
        return 'budget-guesses';
    }

    static format (guess) {
        return guess;
    }

    static async list (params) {
        if (!params.transactionId) {
            throw new ErrorResponse(400, 'Guess budget requires attribute `transactionId`…', {
                attributes: {
                    transactionId: 'Is required!'
                }
            });
        }

        const TransactionLogic = require('./transaction');
        const transaction = await TransactionLogic.get(params.transactionId);
        return TransactionLogic.guessBudget(transaction);
    }
}

module.exports = BudgetGuessLogic;
