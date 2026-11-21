// Builds assets/kevin-mask.avif, the mask for the flames' light on the photo:
// white, with alpha = how bright the photo is there. Transparent pixels and
// the darkest shadows become fully transparent, so the light never lands
// beside the photo. A plain alpha mask works in every browser, Safari included.
//
// usage (macOS): swift tools/light-mask.swift assets/kevin-1024.avif mask.png
//   then: sips -Z 256 mask.png --out mask-256.png
//         sips -s format avif mask-256.png --out assets/kevin-mask.avif
import Foundation
import CoreImage

let args = CommandLine.arguments
let src = CIImage(contentsOf: URL(fileURLWithPath: args[1]))!
// Do the math on the stored sRGB values, like a CSS luminance mask would.
let ctx = CIContext(options: [.workingColorSpace: NSNull()])
let onBlack = src.composited(over: CIImage(color: .black).cropped(to: src.extent))
let mask = onBlack
  .applyingFilter("CIColorMatrix", parameters: [
    "inputRVector": CIVector(x: 0, y: 0, z: 0, w: 0),
    "inputGVector": CIVector(x: 0, y: 0, z: 0, w: 0),
    "inputBVector": CIVector(x: 0, y: 0, z: 0, w: 0),
    "inputAVector": CIVector(x: 0.2126, y: 0.7152, z: 0.0722, w: 0),
    // White, and a small black point so compression noise never shows as a box.
    "inputBiasVector": CIVector(x: 1, y: 1, z: 1, w: -0.012),
  ])
  .applyingFilter("CIColorClamp")
  .cropped(to: src.extent) // the bias would otherwise paint white forever
try! ctx.writePNGRepresentation(of: mask, to: URL(fileURLWithPath: args[2]), format: .RGBA8,
                                colorSpace: CGColorSpace(name: CGColorSpace.sRGB)!)
