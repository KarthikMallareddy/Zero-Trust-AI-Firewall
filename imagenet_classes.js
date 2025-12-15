const IMAGENET_CLASSES = {
  0: 'tench, Tinca tinca',
  1: 'goldfish, Carassius auratus',
  413: 'assault rifle, assault gun',
  414: 'backpack, back pack, knapsack, packsack, rucksack, haversack',
  436: 'beach wagon, station wagon, wagon, estate car, beach waggon, station waggon, waggon',
  504: 'coffee mug',
  505: 'coffeepot',
  620: 'laptop, laptop computer',
  764: 'rifle',
  817: 'sports car, sport car',
  903: 'wig',
  // ... The model outputs indices 0-1000. 
  // We usually import a huge list here, but for this demo, 
  // we will map the model output directly in content.js logic 
  // or use a dynamic fetch if we want the full 1000 words.
};