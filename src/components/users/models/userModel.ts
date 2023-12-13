import { AutoIncrement, Column, DataType, Model, PrimaryKey, Table } from 'sequelize-typescript';
const config = require('config')
import { SequelizeDbHelper } from "../../../../sequlizeDB"
const sequelize = SequelizeDbHelper.getInstance().getSequelizeClint()
@Table({ tableName: "users", underscored: false, modelName: 'User', timestamps: false })
export class User extends Model<User> {
    @PrimaryKey
    @AutoIncrement
    @Column(DataType.BIGINT)
    id: number

    @Column(DataType.STRING)
    username: string

    @Column(DataType.STRING)
    mobile: string

    @Column(DataType.TEXT)
    email: string

    // @Column(DataType.TEXT)
    // unique_id: string

    @Column(DataType.TEXT)
    password: string 

    @Column({
        type: DataType.DATE,
        defaultValue: new Date()
      })
    createdAt: Date;
      
    @Column({
        type: DataType.DATE,
        defaultValue: new Date()
      })
    updatedAt: Date;
}
