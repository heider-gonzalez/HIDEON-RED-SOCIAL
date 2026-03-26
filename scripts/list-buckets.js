import { S3Client, ListBucketsCommand } from '@aws-sdk/client-s3';

const r2AccountId = '137569df68ffc80cc0977391324e77fc';
const r2AccessKeyId = '7b281f30e5ddae13b1e572b74b3ea652';
const r2SecretAccessKey = 'e4c5249a16eaf9d23495afb556cb73b48a47c76e7d0cddc4016d33c207cbba74';

async function listBuckets() {
  console.log('🔍 Listando buckets disponibles en R2...\n');
  
  try {
    const r2Client = new S3Client({
      region: 'auto',
      endpoint: `https://${r2AccountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: r2AccessKeyId,
        secretAccessKey: r2SecretAccessKey,
      },
    });
    
    const command = new ListBucketsCommand({});
    const response = await r2Client.send(command);
    
    console.log('📦 Buckets encontrados:');
    if (response.Buckets && response.Buckets.length > 0) {
      response.Buckets.forEach((bucket, index) => {
        console.log(`   ${index + 1}. ${bucket.Name} (Creado: ${bucket.CreationDate})`);
      });
    } else {
      console.log('   ❌ No se encontraron buckets');
    }
    
  } catch (error) {
    console.error('❌ Error listando buckets:', error.message);
  }
}

listBuckets();
