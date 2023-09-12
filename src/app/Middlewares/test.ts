// export function extractPostcode() {
//   try {
//     const data = 
//   // ... (the provided data)
//   {
//     "_id": {
//       "$oid": "64f6f52da222e6ad4c56a403"
//     },
//     "type": "Feature",
//     "properties": {
//       "osm_id": "29306",
//       "name": null,
//       "type": "restriction",
//       "other_tags": "\"restriction\"=>\"no_right_turn\""
//     },
//     "geometry": {
//       "type": "GeometryCollection",
//       "geometries": [
//         {
//           "type": "Point",
//           "coordinates": [
//             -6.35666,
//             53.71594
//           ]
//         },
//         {
//           "type": "LineString",
//           "coordinates": [
//             [
//               -6.35704,
//               53.7153
//             ],
//             [
//               -6.35694,
//               53.71549
//             ],
//             [
//               -6.35684,
//               53.71568
//             ],
//             [
//               -6.35666,
//               53.71594
//             ],
//           ]
//         },]
//       }
//     }
  
//     const properties = data.properties;
//     const otherTags = properties.other_tags;

//     // Assuming "other_tags" is in the format "\"restriction\"=>\"no_right_turn\""
//     const regex = /"postcode"=>"(\w+)"/;
//     const match = otherTags.match(regex);

//     if (match && match[1]) {
//       return match[1];
//     } else {
//       return null;
//     }
//   } catch (error) {
//     console.error("Error extracting postcode:", error);
//     return null;
//   }
// }

// // Example usage

// const data = 
//   // ... (the provided data)
//   {
//     "_id": {
//       "$oid": "64f6f52da222e6ad4c56a403"
//     },
//     "type": "Feature",
//     "properties": {
//       "osm_id": "29306",
//       "name": null,
//       "type": "restriction",
//       "other_tags": "\"restriction\"=>\"no_right_turn\""
//     },
//     "geometry": {
//       "type": "GeometryCollection",
//       "geometries": [
//         {
//           "type": "Point",
//           "coordinates": [
//             -6.35666,
//             53.71594
//           ]
//         },
//         {
//           "type": "LineString",
//           "coordinates": [
//             [
//               -6.35704,
//               53.7153
//             ],
//             [
//               -6.35694,
//               53.71549
//             ],
//             [
//               -6.35684,
//               53.71568
//             ],
//             [
//               -6.35666,
//               53.71594
//             ],
//           ]
//         },]
//       }
//     }
  

// const postcode = extractPostcode(data);
// console.log("Postcode---------------------:", postcode);