import mongoose from 'mongoose';
import { config } from './config.js';

let backupConnection = null;

export async function connectBackupDatabase() {
  if (!config.mongoBackupUri) {
    console.log('MongoDB backup disabled: MONGODB_BACKUP is not configured');
    return;
  }

  if (config.mongoBackupUri === config.mongoUri) {
    console.log('MongoDB backup disabled: MONGODB_BACKUP matches MONGO_URI');
    return;
  }

  try {
    backupConnection = mongoose.createConnection(config.mongoBackupUri);
    await backupConnection.asPromise();
    console.log('MongoDB backup connected');
  } catch (error) {
    backupConnection = null;
    console.error('MongoDB backup connection failed:', error.message);
  }
}

export async function syncExistingDataToBackup(models = []) {
  if (!backupConnection) return;

  for (const model of models) {
    const docs = await model.find();
    if (!docs.length) continue;
    const collection = backupConnection.collection(model.collection.name);
    await collection.bulkWrite(
      docs.map((doc) => {
        const data = plainDoc(doc);
        return {
          replaceOne: {
            filter: { _id: data._id },
            replacement: data,
            upsert: true,
          },
        };
      }),
      { ordered: false },
    );
    console.log(`MongoDB backup synced ${docs.length} ${model.modelName} records`);
  }
}

function plainDoc(doc) {
  if (!doc) return null;
  if (typeof doc.toObject === 'function') {
    return doc.toObject({
      depopulate: true,
      flattenMaps: true,
      versionKey: true,
      virtuals: false,
    });
  }
  return doc;
}

async function mirrorDocument(doc) {
  if (!backupConnection || !doc?._id || !doc.constructor?.collection?.name) return;
  const data = plainDoc(doc);
  await backupConnection
    .collection(doc.constructor.collection.name)
    .replaceOne({ _id: data._id }, data, { upsert: true });
}

async function mirrorQueryResult(query) {
  if (!backupConnection) return;
  const docs = await query.model.find(query.getFilter());
  await Promise.all(docs.map((doc) => mirrorDocument(doc)));
}

function logMirrorError(modelName, error) {
  console.error(`MongoDB backup sync failed for ${modelName}:`, error.message);
}

export function attachBackupSync(schema, modelName) {
  schema.post('save', async function syncSavedDocument(doc) {
    try {
      await mirrorDocument(doc);
    } catch (error) {
      logMirrorError(modelName, error);
    }
  });

  schema.post(['updateOne', 'updateMany', 'findOneAndUpdate'], async function syncUpdatedDocuments() {
    try {
      await mirrorQueryResult(this);
    } catch (error) {
      logMirrorError(modelName, error);
    }
  });
}
