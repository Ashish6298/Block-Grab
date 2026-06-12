const fs = require('fs');
const path = require('path');

const iconsDir = path.join(__dirname, 'src/assets/icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// A simple blue shield-themed PNG icon base64
const iconBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAIAAAACACAYAAADDPmHLAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAIGNIUk0AAHolAACAgwAA+f8AAIDpAAB1MAAA6mAAADqYAAAXb5JfxUYAAAMJSURBVHja7N0xalxRFIXhP29gYyV2rsF1iF2Dq3ENrsHVuAZX4+rchmsQZCHYWFnIeAYmJ4gQM3Nn5t73wocK48t3+eBwODkiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIioqK23f4E28B94G735wHwEngNfOn+/NbxuQ1cB150f146Po+B58Dz7s+Tjs9d4K7HExER5esB8Ah4DTzvfO4DT4CnRz4fA4+Br92fJx2f+8Dz7s/jjs9d4K7HE5l+2+1PAeAUeAb87Pz8Bv4CfwK/gE/Ad+Bv53MH+AT8Bj7u/nzc8bkPPAW+d38+On5v0x9P9P8EADgC3gCfuwT+BnwNfAHeH/l8B3xOfy8APnZ/Xu343O//wOfuz8eOz33gqccTmbxX/2r/wO/u+zXwtfsFvO3++g/87hL4mP75X/u/w+eWx/X0x/jS/b11f37u+Pw4fW/TH09knk8AXgC/D/wEegH8PfK5F8APpxfvfH3/LgHgw+nF+5j++KPHExEREZF8wUv+A8GfgA/gB/A9p0ffu+t6+s7xOcfnZ/p7/r3f8fPHc/Sj4XMTOMxO/YiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIjwB35F+A29o5lQAAAAAElFTkSuQmCC';

const sizes = [16, 48, 128];
sizes.forEach(size => {
  const iconPath = path.join(iconsDir, `icon${size}.png`);
  fs.writeFileSync(iconPath, Buffer.from(iconBase64, 'base64'));
  console.log(`Created icon: ${iconPath}`);
});

console.log('Icons generated successfully!');
