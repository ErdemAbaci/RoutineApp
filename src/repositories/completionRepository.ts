import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  PutCommand,
  QueryCommand,
} from "@aws-sdk/lib-dynamodb";
import type { RoutineCompletion } from "../types/completion";

const dynamoDbClient = new DynamoDBClient({});
const dynamoDb = DynamoDBDocumentClient.from(dynamoDbClient);

function getTableName() {
  const tableName = process.env.COMPLETIONS_TABLE_NAME;

  if (!tableName) {
    throw new Error("COMPLETIONS_TABLE_NAME environment variable is required");
  }

  return tableName;
}

export const completionRepository = {
  async upsert(completion: RoutineCompletion): Promise<void> {
    await dynamoDb.send(
      new PutCommand({
        TableName: getTableName(),
        Item: completion,
      }),
    );
  },

  async listByOwnerAndDate(
    ownerId: string,
    date: string,
  ): Promise<RoutineCompletion[]> {
    const response = await dynamoDb.send(
      new QueryCommand({
        TableName: getTableName(),
        IndexName: "ownerId-date-index",
        KeyConditionExpression: "ownerId = :ownerId AND #date = :date",
        ExpressionAttributeNames: {
          "#date": "date",
        },
        ExpressionAttributeValues: {
          ":ownerId": ownerId,
          ":date": date,
        },
      }),
    );

    return (response.Items as RoutineCompletion[] | undefined) ?? [];
  },
};