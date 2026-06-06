import dotenv from 'dotenv';
import { Sequelize, DataTypes, Model } from 'sequelize';

dotenv.config();

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is not defined");
}

export const sequelize = new Sequelize(databaseUrl, {
  dialect: 'postgres',
  logging: false,
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false,
    },
  },
});

export class Conversation extends Model {
  public id!: string;
  public readonly createdAt!: Date;
}
Conversation.init(
  {
    id: { type: DataTypes.STRING, primaryKey: true },
  },
  { sequelize, modelName: 'conversation', timestamps: true, updatedAt: false }
);


export class Message extends Model {
  public id!: number;
  public conversationId!: string;
  public sender!: 'user' | 'ai';
  public text!: string;
  public readonly createdAt!: Date;
}

Message.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    conversationId: { type: DataTypes.STRING, allowNull: false },
    sender: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: { isIn: [['user', 'ai']] }, 
    },
    text: { type: DataTypes.TEXT, allowNull: false },
  },
  { sequelize, modelName: 'message', timestamps: true, updatedAt: false }
);

Conversation.hasMany(Message, { foreignKey: 'conversationId', onDelete: 'CASCADE' });
Message.belongsTo(Conversation, { foreignKey: 'conversationId' });