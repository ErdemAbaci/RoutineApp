import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  QueryCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";
import type {
  DailyRoutineSnapshot,
  DailySummary,
} from "../types/dailySummary";

const dynamoDbClient = new DynamoDBClient({});
const dynamoDb = DynamoDBDocumentClient.from(dynamoDbClient);

function getTableName() {
  const tableName = process.env.DAILY_SUMMARIES_TABLE_NAME;

  if (!tableName) {
    throw new Error("DAILY_SUMMARIES_TABLE_NAME environment variable is required");
  }

  return tableName;
}

export const summaryRepository = {
  async upsert(summary: DailySummary): Promise<void> {
    await dynamoDb.send(
      new PutCommand({
        TableName: getTableName(),
        Item: summary,
      }),
    );
  },

  async saveOpenPlanIfUnplanned(summary: DailySummary): Promise<boolean> {
    try {
      await dynamoDb.send(
        new PutCommand({
          TableName: getTableName(),
          Item: summary,
          ConditionExpression:
            "attribute_not_exists(id) OR (#finalized = :notFinalized AND attribute_not_exists(routineSnapshots))",
          ExpressionAttributeNames: {
            "#finalized": "finalized",
          },
          ExpressionAttributeValues: {
            ":notFinalized": false,
          },
        }),
      );

      return true;
    } catch (error) {
      if (
        error instanceof Error &&
        error.name === "ConditionalCheckFailedException"
      ) {
        return false;
      }

      throw error;
    }
  },

  async appendRoutineSnapshotIfOpen(
    ownerId: string,
    date: string,
    snapshot: DailyRoutineSnapshot,
    updatedAt: string,
  ): Promise<boolean> {
    try {
      await dynamoDb.send(
        new UpdateCommand({
          TableName: getTableName(),
          Key: {
            id: `${ownerId}#${date}`,
          },
          UpdateExpression:
            "SET routineSnapshots = list_append(routineSnapshots, :snapshot), updatedAt = :updatedAt",
          ConditionExpression:
            "attribute_exists(id) AND #finalized = :notFinalized AND attribute_exists(routineSnapshots)",
          ExpressionAttributeNames: {
            "#finalized": "finalized",
          },
          ExpressionAttributeValues: {
            ":snapshot": [snapshot],
            ":updatedAt": updatedAt,
            ":notFinalized": false,
          },
        }),
      );

      return true;
    } catch (error) {
      if (
        error instanceof Error &&
        error.name === "ConditionalCheckFailedException"
      ) {
        return false;
      }

      throw error;
    }
  },

  async getByOwnerAndDate(
    ownerId: string,
    date: string,
  ): Promise<DailySummary | null> {
    const response = await dynamoDb.send(
      new GetCommand({
        TableName: getTableName(),
        Key: {
          id: `${ownerId}#${date}`,
        },
      }),
    );

    return (response.Item as DailySummary | undefined) ?? null;
  },

  async listByOwner(ownerId: string, limit = 30): Promise<DailySummary[]> {
    const response = await dynamoDb.send(
      new QueryCommand({
        TableName: getTableName(),
        IndexName: "ownerId-date-index",
        KeyConditionExpression: "ownerId = :ownerId",
        ExpressionAttributeValues: {
          ":ownerId": ownerId,
        },
        ScanIndexForward: false,
        Limit: limit,
      }),
    );

    return (response.Items as DailySummary[] | undefined) ?? [];
  },
 
  async getLatestByOwner(ownerId: string): Promise<DailySummary | null> {
    const response = await dynamoDb.send(
      new QueryCommand({
        TableName: getTableName(),
        IndexName: "ownerId-date-index",
        KeyConditionExpression: "ownerId = :ownerId",
        ExpressionAttributeValues: {
          ":ownerId": ownerId,
        },
        ScanIndexForward: false,
        Limit: 1,
      }),
    );

    const items = response.Items as DailySummary[] | undefined;

    return items?.[0] ?? null;
  },  
};
