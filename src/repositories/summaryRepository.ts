import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  QueryCommand,
} from "@aws-sdk/lib-dynamodb";
import type { DailySummary } from "../types/dailySummary";

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

