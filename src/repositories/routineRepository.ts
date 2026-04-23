import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand, QueryCommand, GetCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import type { Routine } from "../types/routine";

const dynamoDbClient = new DynamoDBClient({});
const dynamoDb = DynamoDBDocumentClient.from(dynamoDbClient);

function getTableName() {
  const tableName = process.env.ROUTINES_TABLE_NAME;

  if (!tableName) {
    throw new Error("ROUTINES_TABLE_NAME environment variable is required");
  }

  return tableName;
}

export const routineRepository = {
  async create(routine: Routine): Promise<void> {
    await dynamoDb.send(
      new PutCommand({
        TableName: getTableName(),
        Item: routine,
      }),
    );
  },

  async listByOwner(ownerId: string): Promise<Routine[]> {
    const response = await dynamoDb.send(
      new QueryCommand({
        TableName: getTableName(),
        IndexName: "ownerId-createdAt-index",
        KeyConditionExpression: "ownerId = :ownerId",
        ExpressionAttributeValues: {
          ":ownerId": ownerId,
        },
      }),
    );

    return (response.Items as Routine[] | undefined) ?? [];
  },

  async getById(id: string): Promise<Routine | null> {
    const response = await dynamoDb.send(
      new GetCommand({
        TableName: getTableName(),
        Key: {
          id,
        },
      }),
    );

    return (response.Item as Routine | undefined) ?? null;
  },

  async update(routine: Routine): Promise<void> {
    await dynamoDb.send(
      new UpdateCommand({
        TableName: getTableName(),
        Key: {
          id: routine.id,
        },
        UpdateExpression: `
          SET
            title = :title,
            category = :category,
            description = :description,
            frequencyType = :frequencyType,
            daysOfWeek = :daysOfWeek,
            scheduledTime = :scheduledTime,
            reminderEnabled = :reminderEnabled,
            updatedAt = :updatedAt
        `,
        ExpressionAttributeValues: {
          ":title": routine.title,
          ":category": routine.category,
          ":description": routine.description ?? null,
          ":frequencyType": routine.frequencyType,
          ":daysOfWeek": routine.daysOfWeek ?? [],
          ":scheduledTime": routine.scheduledTime,
          ":reminderEnabled": routine.reminderEnabled,
          ":updatedAt": routine.updatedAt,
        },
      }),
    );
  },

  async archive(id: string, updatedAt: string): Promise<void> {
    await dynamoDb.send(
      new UpdateCommand({
        TableName: getTableName(),
        Key: {
          id,
        },
        UpdateExpression: `
          SET
            #status = :status,
            updatedAt = :updatedAt
        `,
        ExpressionAttributeNames: {
          "#status": "status",
        },
        ExpressionAttributeValues: {
          ":status": "archived",
          ":updatedAt": updatedAt,
        },
      }),
    );
  },
};


