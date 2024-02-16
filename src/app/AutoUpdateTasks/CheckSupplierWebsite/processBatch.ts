import PQueue from "p-queue";
import { SupplierLink } from "../../Models/SupplierLink";
import { updateSupplierLink } from "./updateSupplierLink";

export async function processBatch(startIndex: number, batchSize: number) {
  const nestedQueue = new PQueue({ concurrency: 10 });

  nestedQueue.on("next", () => console.log(`Next on NQ ${startIndex}`));

  const batch = await SupplierLink.find({})
    .select("_id")
    .skip(startIndex)
    .limit(batchSize);
  batch.forEach((supplierLink) =>
    nestedQueue.add(() => updateSupplierLink(supplierLink._id))
  );
}

export async function updateSupplierBatch(batchSize: number) {
  const mainQueue = new PQueue({ concurrency: 1 });
  const totalLinks = await SupplierLink.countDocuments();
  const totalPages = Math.ceil(totalLinks / batchSize);

  mainQueue.on("active", () => console.log("Q Active"));
  mainQueue.on("idle", () => console.log("Q Empty"));

  for (let page = 0; page < totalPages; page++) {
    const startIndex = page * batchSize;
    await mainQueue.add(() => processBatch(startIndex, batchSize));
  }
}
