import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";
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
};