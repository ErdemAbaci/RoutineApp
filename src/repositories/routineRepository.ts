import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  QueryCommand,
  TransactWriteCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";
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

  async createUnique(routine: Routine): Promise<void> {
    if (!routine.duplicateKey) {
      throw new Error("Routine duplicate key is required");
    }

    try {
      await dynamoDb.send(
        new TransactWriteCommand({
          TransactItems: [
            {
              Put: {
                TableName: getTableName(),
                Item: {
                  id: routine.duplicateKey,
                  type: "routine_duplicate_marker",
                  routineId: routine.id,
                  createdAt: routine.createdAt,
                },
                ConditionExpression: "attribute_not_exists(id)",
              },
            },
            {
              Put: {
                TableName: getTableName(),
                Item: routine,
                ConditionExpression: "attribute_not_exists(id)",
              },
            },
          ],
        }),
      );
    } catch (error) {
      if (
        error instanceof Error &&
        error.name === "TransactionCanceledException"
      ) {
        throw new Error("Routine already exists");
      }

      throw error;
    }
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

  async archiveAndReleaseDuplicateKey(
    routine: Routine,
    updatedAt: string,
  ): Promise<void> {
    if (!routine.duplicateKey) {
      await this.archive(routine.id, updatedAt);
      return;
    }

    await dynamoDb.send(
      new TransactWriteCommand({
        TransactItems: [
          {
            Update: {
              TableName: getTableName(),
              Key: {
                id: routine.id,
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
            },
          },
          {
            Delete: {
              TableName: getTableName(),
              Key: {
                id: routine.duplicateKey,
              },
            },
          },
        ],
      }),
    );
  },
};
