import {
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  Model,
  Sequelize,
} from 'sequelize'

export const sequelize = new Sequelize({
  dialect: 'sqlite',
  // storage: 'database.sqlite', // Path to the SQLite database file (default is memory)
  logging: false,
})

export class EmailVerification extends Model<
  InferAttributes<EmailVerification>,
  InferCreationAttributes<EmailVerification>
> {
  declare webId: string
  declare email: string
  declare inbox: string
  declare tokenHash: string
  declare tokenExpiration: number
}

EmailVerification.init(
  {
    webId: DataTypes.STRING,
    email: DataTypes.STRING,
    inbox: DataTypes.STRING,
    tokenHash: DataTypes.STRING,
    tokenExpiration: DataTypes.INTEGER,
  },
  { sequelize },
)

export class Integration extends Model<
  InferAttributes<Integration>,
  InferCreationAttributes<Integration>
> {
  declare webId: string
  declare email: string
  declare inbox: string
}

Integration.init(
  {
    webId: DataTypes.STRING,
    email: DataTypes.STRING,
    inbox: DataTypes.STRING,
  },
  { sequelize },
)

// this returns promise and maybe we should wait for it
sequelize.sync()
