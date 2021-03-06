import { getRepository, Between, Repository } from "typeorm";

import { Statement } from "../entities/Statement";
import { ICreateStatementDTO } from "../useCases/createStatement/ICreateStatementDTO";
import { IGetBalanceDTO } from "../useCases/getBalance/IGetBalanceDTO";
import { IGetBalanceByDateDTO } from "../useCases/getBalanceByDate/IGetBalanceByDateDTO";
import { IGetStatementOperationDTO } from "../useCases/getStatementOperation/IGetStatementOperationDTO";
import { IStatementsRepository } from "./IStatementsRepository";

export class StatementsRepository implements IStatementsRepository {
  private repository: Repository<Statement>;

  constructor() {
    this.repository = getRepository(Statement);
  }

  async create({
    user_id,
    amount,
    description,
    type,
    sender_id
  }: ICreateStatementDTO): Promise<Statement> {
    if (type === 'transfer') {
      const statement = this.repository.create({
        user_id: sender_id,
        amount,
        description,
        type,
      });

      await this.repository.save(statement);
    }

    const statement = this.repository.create({
      user_id,
      amount,
      description,
      type,
      sender_id
    });

    return this.repository.save(statement);
  }

  async findStatementOperation({ statement_id, user_id }: IGetStatementOperationDTO): Promise<Statement | undefined> {
    return this.repository.findOne(statement_id, {
      where: { user_id }
    });
  }

  async getUserBalance({ user_id, with_statement = false }: IGetBalanceDTO):
    Promise<
      { balance: number } | { balance: number, statement: Statement[] }
    > {
    const statement = await this.repository.find({
      where: { user_id }
    });

    const balance = statement.reduce((acc, operation) => {
      if ((operation.type === 'deposit') || (operation.type === 'transfer' && operation.sender_id !== null)) {
        return acc + Number(operation.amount);
      } else if ((operation.type === 'withdraw') || (operation.type === 'transfer' && operation.sender_id === null)) {
        return acc - Number(operation.amount);
      }
    }, 0)

    if (with_statement) {
      return {
        statement,
        balance
      }
    }

    return { balance }
  }

  async getUserBalanceByDate({ user_id, start_date, end_date }: IGetBalanceByDateDTO): Promise<{ balance: number, statement: Statement[] }> {
    const statement = await this.repository.find({
      where: {
        user_id,
        created_at: Between(start_date, end_date)
      }
    });

    const balance = statement.reduce((acc, operation) => {
      if ((operation.type === 'deposit') || (operation.type === 'transfer' && operation.sender_id !== null)) {
        return acc + Number(operation.amount);
      } else if ((operation.type === 'withdraw') || (operation.type === 'transfer' && operation.sender_id === null)) {
        return acc - Number(operation.amount);
      }
    }, 0)


    return {
      statement,
      balance
    }
  }
}
