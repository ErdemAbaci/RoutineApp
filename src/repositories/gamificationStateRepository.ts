import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
} from "@aws-sdk/lib-dynamodb";
import type { GamificationState } from "../types/gamificationState";

const dynamoDbClient = new DynamoDBClient({});
const dynamoDb = DynamoDBDocumentClient.from(dynamoDbClient);

function getTableName() {
  const tableName = process.env.GAMIFICATION_STATE_TABLE_NAME;

  if (!tableName) {
    throw new Error("GAMIFICATION_STATE_TABLE_NAME environment variable is required");
  }

  return tableName;
}

export const gamificationStateRepository = {
  async getByOwner(ownerId: string): Promise<GamificationState | null> {
    const response = await dynamoDb.send(
      new GetCommand({
        TableName: getTableName(),
        Key: {
          ownerId,
        },
      }),
    );

    return (response.Item as GamificationState | undefined) ?? null;
  },

  async upsert(state: GamificationState): Promise<void> {
    await dynamoDb.send(
      new PutCommand({
        TableName: getTableName(),
        Item: state,
      }),
    );
  },
};
