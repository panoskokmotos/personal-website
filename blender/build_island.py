"""Build Panos's floating-island resume scene in Blender and export it as GLB.

Run headless:
  ~/Applications/Blender.app/Contents/MacOS/Blender -b -P build_island.py -- <out_dir>

Naming contract with the web page:
  LM_<id>    landmark root (one per resume chapter; the page raycasts to these)
  SPINY_*    spins around the vertical axis
  SPINZ_*    spins around its facing axis (windmill sails)
  GLOW_*     emissive bits the page can pulse
  CLOUD_*    clouds that bob
"""
import sys, os
# Blender 4.5's bundled numpy needs macOS 13.3+; on macOS 12 load numpy 1.26 from ./pydeps first.
_deps = os.path.join(os.path.dirname(os.path.abspath(__file__)), "pydeps")
if os.path.isdir(_deps):
    sys.path.insert(0, _deps)
import bpy, bmesh, math, random
from mathutils import Vector

out_dir = sys.argv[sys.argv.index("--") + 1] if "--" in sys.argv else os.getcwd()
os.makedirs(out_dir, exist_ok=True)
random.seed(7)
bpy.ops.wm.read_factory_settings(use_empty=True)

# ---------- helpers ----------
MATS = {}
def srgb_to_lin(x):
    return x / 12.92 if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4

def mat(name, hexcol, rough=0.85, metal=0.0, emit=0.0):
    if name in MATS:
        return MATS[name]
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    b = m.node_tree.nodes["Principled BSDF"]
    h = hexcol.lstrip("#")
    lin = [srgb_to_lin(int(h[i:i + 2], 16) / 255) for i in (0, 2, 4)]
    b.inputs["Base Color"].default_value = (*lin, 1)
    b.inputs["Roughness"].default_value = rough
    b.inputs["Metallic"].default_value = metal
    if emit > 0:
        b.inputs["Emission Color"].default_value = (*lin, 1)
        b.inputs["Emission Strength"].default_value = emit
    m.diffuse_color = (*lin, 1)  # workbench preview colour
    MATS[name] = m
    return m

# Palette matched to panoskokmotos.com (style.css tokens: --bg #0d1530, --blue #3b6ef8, --blue-light #6090ff,
# --gold #f4a924, --givelink-purple #5718CA, --givelink-pink #C2185B). Navy underside so the island sits in the site.
GRASS = mat("grass", "#5f9b78"); GRASS2 = mat("grass_dark", "#3f7a5e")
DIRT = mat("dirt", "#3a4670"); ROCK = mat("rock", "#24305a"); ROCK2 = mat("rock_dark", "#18213f")
WHITE = mat("lime_white", "#f3f5fa", 0.9); BLUE = mat("aegean_blue", "#3b6ef8", 0.45)
WINDOW = mat("window", "#3b6ef8", 0.45)
WOOD = mat("wood", "#6b5240"); THATCH = mat("thatch", "#d1ad72")
RED = mat("heart_pink", "#c2185b", 0.4); ORANGE = mat("bridge_gold", "#f4a924", 0.5)
GOLD = mat("gold", "#f4a924", 0.3, 0.6); DARK = mat("navy", "#1a2347", 0.4, 0.3)
GRILLE = mat("grille", "#aab6d3", 0.3, 0.6); MARBLE = mat("marble", "#eef1f8", 0.6)
LAMP = mat("lamp", "#f4a924", 0.3, 0.0, 6.0); ONAIR = mat("onair", "#c2185b", 0.3, 0.0, 4.0)
STRIPE = mat("stripe_blue", "#3b6ef8", 0.5)
PINE = mat("pine", "#2f6b52"); OLIVE = mat("olive", "#7fa08a"); TRUNK = mat("trunk", "#5a4636")
CLOUD = mat("cloud", "#f4f7ff", 1.0); STONE = mat("path_stone", "#dfe6f5")
SKIN = mat("skin", "#d9a77f"); HAIR = mat("hair", "#2a1d16"); SHIRT = mat("shirt", "#3b6ef8", 0.6)
VAN = mat("van_purple", "#5718ca", 0.5); TYRE = mat("tyre", "#11162b", 0.8)
GIFT1 = mat("gift_purple", "#5718ca"); GIFT2 = mat("gift_gold", "#f4a924"); GIFT3 = mat("gift_blue", "#6090ff")

def finish(o, m, parent=None, name=None):
    if m is not None:
        o.data.materials.clear()
        o.data.materials.append(m)
    for p in o.data.polygons:
        p.use_smooth = False
    if parent is not None:
        o.parent = parent
    if name:
        o.name = name
    return o

def cyl(r, d, loc, m, verts=12, parent=None, r2=None, name=None, rot=(0, 0, 0)):
    if r2 is None:
        bpy.ops.mesh.primitive_cylinder_add(vertices=verts, radius=r, depth=d, location=loc, rotation=rot)
    else:
        bpy.ops.mesh.primitive_cone_add(vertices=verts, radius1=r, radius2=r2, depth=d, location=loc, rotation=rot)
    return finish(bpy.context.active_object, m, parent, name)

def box(size, loc, m, parent=None, name=None, rot=(0, 0, 0)):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc, rotation=rot)
    o = bpy.context.active_object
    o.scale = size
    return finish(o, m, parent, name)

def ico(r, loc, m, sub=1, parent=None, name=None, scale=(1, 1, 1)):
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=sub, radius=r, location=loc)
    o = bpy.context.active_object
    o.scale = scale
    return finish(o, m, parent, name)

def empty(name, loc, parent=None):
    o = bpy.data.objects.new(name, None)
    o.location = loc
    bpy.context.collection.objects.link(o)
    if parent is not None:
        o.parent = parent
    return o

def rod(p1, p2, r, m, parent=None, verts=6):
    p1, p2 = Vector(p1), Vector(p2)
    d = p2 - p1
    o = cyl(r, d.length, (p1 + p2) / 2, m, verts=verts, parent=parent)
    o.rotation_mode = "QUATERNION"
    o.rotation_quaternion = Vector((0, 0, 1)).rotation_difference(d.normalized())
    return o

def mesh_from(name, verts, faces, mats, face_mats, parent=None, loc=(0, 0, 0)):
    me = bpy.data.meshes.new(name)
    me.from_pydata(verts, [], faces)
    me.update()
    o = bpy.data.objects.new(name, me)
    o.location = loc
    bpy.context.collection.objects.link(o)
    for m in mats:
        me.materials.append(m)
    for i, p in enumerate(me.polygons):
        p.material_index = face_mats[i]
        p.use_smooth = False
    if parent is not None:
        o.parent = parent
    return o

def prism(w, d, h, loc, m, parent=None, name="prism"):
    v = [(-w, -d, 0), (w, -d, 0), (0, -d, h), (-w, d, 0), (w, d, 0), (0, d, h)]
    f = [(0, 1, 2), (5, 4, 3), (0, 3, 4, 1), (1, 4, 5, 2), (2, 5, 3, 0)]
    return mesh_from(name, v, f, [m], [0] * len(f), parent, loc)

# ---------- island ----------
def rim_radius(t, base):
    return base * (1 + 0.07 * math.sin(3 * t + 0.5) + 0.05 * math.cos(5 * t) + random.uniform(-0.03, 0.03))

def build_island(name, base_r, center, depth_scale=1.0):
    N = 28
    ts = [2 * math.pi * i / N for i in range(N)]
    rim = [rim_radius(t, base_r) for t in ts]
    rings = [  # (scale of rim, z, jitter)
        (0.36, 0.22, 0.05), (0.7, 0.14, 0.06), (1.0, 0.0, 0.02),
        (0.98, -0.45, 0.04),                     # dirt lip
        (0.78, -1.6 * depth_scale, 0.18), (0.5, -2.9 * depth_scale, 0.18), (0.22, -4.0 * depth_scale, 0.12),
    ]
    verts = [(0, 0, 0.26)]
    for s, z, j in rings:
        for i, t in enumerate(ts):
            r = rim[i] * s * (1 + random.uniform(-j, j) * (0.4 if s > 0.9 else 1))
            verts.append((r * math.cos(t), r * math.sin(t), z + random.uniform(-j, j) * 0.5))
    tip = len(verts)
    verts.append((random.uniform(-0.2, 0.2), random.uniform(-0.2, 0.2), -5.0 * depth_scale))
    faces, fm = [], []
    ring = lambda k, i: 1 + k * N + (i % N)
    for i in range(N):
        faces.append((0, ring(0, i), ring(0, i + 1))); fm.append(0)
    for k in range(len(rings) - 1):
        for i in range(N):
            faces.append((ring(k, i), ring(k + 1, i), ring(k + 1, i + 1), ring(k, i + 1)))
            fm.append(0 if k < 2 else (1 if k == 2 else 2 + (i + k) % 2))
    last = len(rings) - 1
    for i in range(N):
        faces.append((ring(last, i), tip, ring(last, i + 1))); fm.append(3)
    o = mesh_from(name, verts, faces, [GRASS, DIRT, ROCK, ROCK2], fm, loc=center)
    # Faceted look: triangulate quads.
    bpy.context.view_layer.objects.active = o
    o.select_set(True)
    bpy.ops.object.mode_set(mode="EDIT")
    bpy.ops.mesh.select_all(action="SELECT")
    bpy.ops.mesh.quads_convert_to_tris()
    bpy.ops.object.mode_set(mode="OBJECT")
    o.select_set(False)
    return o

island = build_island("ISLAND_main", 6.0, (0, 0, 0))
islet = build_island("ISLAND_sf", 1.6, (9.2, -0.6, -0.05), depth_scale=0.45)
for i, (x, y, z, r) in enumerate([(-4.5, -3.5, -5.5, 0.45), (3.8, 4.2, -4.6, 0.35), (-1.2, 5.6, -6.6, 0.28), (6.2, -4.4, -3.8, 0.3)]):
    ico(r, (x, y, z), ROCK if i % 2 else ROCK2, sub=1, name=f"ROCKBIT_{i}", scale=(1, 1, 1.3))

# ---------- landmarks ----------
Z = 0.18

def givelink(root):
    box((1.9, 1.6, 1.25), (0, 0, Z + 0.62), WHITE, root)
    box((1.0, 1.1, 0.85), (1.35, 0.25, Z + 0.42), WHITE, root)
    ico(0.6, (0, 0, Z + 1.25), BLUE, sub=2, parent=root, scale=(1, 1, 0.9))
    box((0.36, 0.06, 0.62), (0, -0.81, Z + 0.32), WINDOW, root)               # door
    for x in (-0.6, 0.6):
        box((0.26, 0.06, 0.26), (x, -0.81, Z + 0.82), WINDOW, root)          # windows
    box((0.26, 0.06, 0.26), (1.35, -0.31, Z + 0.5), WINDOW, root)
    # Heart that turns above the dome.
    pts = []
    for i in range(32):
        t = 2 * math.pi * i / 32
        x = 16 * math.sin(t) ** 3
        y = 13 * math.cos(t) - 5 * math.cos(2 * t) - 2 * math.cos(3 * t) - math.cos(4 * t)
        pts.append((x * 0.028, 0, y * 0.028))
    n = len(pts)
    v = [(x, -0.09, z) for x, _, z in pts] + [(x, 0.09, z) for x, _, z in pts]
    f = [tuple(range(n)), tuple(reversed(range(n, 2 * n)))] + [(i, (i + 1) % n, n + (i + 1) % n, n + i) for i in range(n)]
    spin = empty("SPINY_heart", (0, 0, Z + 2.55), root)
    mesh_from("heart", v, f, [RED], [0] * len(f), spin)
    # Panos, waving by the door (low-poly, faces the visitor).
    me = empty("AVATAR", (0.95, -1.3, Z), root)
    for dx in (-0.07, 0.07):
        box((0.09, 0.1, 0.36), (dx, 0, 0.18), DARK, me)
    box((0.3, 0.16, 0.36), (0, 0, 0.54), SHIRT, me)
    ico(0.13, (0, 0, 0.86), SKIN, sub=1, parent=me)
    ico(0.135, (0, 0.02, 0.92), HAIR, sub=1, parent=me, scale=(1, 1, 0.55))
    box((0.07, 0.08, 0.32), (-0.19, 0, 0.52), SHIRT, me, rot=(0, 0.12, 0))
    arm = empty("WAVE_arm", (0.17, 0, 0.68), me)
    box((0.07, 0.08, 0.32), (0.03, 0, 0.15), SHIRT, arm, rot=(0, 0.2, 0))
    ico(0.045, (0.06, 0, 0.33), SKIN, sub=0, parent=arm)
    # A few wrapped gifts by the door: the in-kind donations.
    for (x, y, s, m) in [(-0.75, -1.15, 0.32, GIFT1), (-0.42, -1.25, 0.24, GIFT2), (-0.62, -1.2, 0.2, GIFT3)]:
        zz = Z + s / 2 + (0.32 if m is GIFT3 else 0)
        box((s, s, s), (x, y, zz), m, root)
        box((s * 1.02, 0.05, s * 1.02), (x, y, zz), WHITE, root)

def windmill(root):
    cyl(0.6, 1.7, (0, 0, Z + 0.85), WHITE, verts=14, parent=root)
    cyl(0.68, 0.75, (0, 0, Z + 2.05), THATCH, verts=14, r2=0.0, parent=root)
    box((0.3, 0.06, 0.5), (0, -0.6, Z + 0.25), WINDOW, root)
    hub = empty("SPINZ_sails", (0, -0.72, Z + 1.75), root)
    cyl(0.09, 0.3, (0, 0, 0), WOOD, verts=8, parent=hub, rot=(math.pi / 2, 0, 0))
    for k in range(6):
        a = k * math.pi / 3
        dx, dz = math.cos(a), math.sin(a)
        rod((0, -0.05, 0), (1.35 * dx, -0.05, 1.35 * dz), 0.035, WOOD, parent=hub)
        # triangular sail beside each spar
        px, pz = -dz, dx
        v = [(0.25 * dx, -0.04, 0.25 * dz), (1.3 * dx, -0.04, 1.3 * dz), (1.15 * dx + 0.32 * px, -0.04, 1.15 * dz + 0.32 * pz)]
        mesh_from("sail", v, [(0, 1, 2), (2, 1, 0)], [WHITE], [0, 0], hub)

def podcast(root):
    cyl(0.45, 0.1, (0, 0, Z + 0.05), DARK, verts=16, parent=root)
    cyl(0.06, 1.6, (0, 0, Z + 0.85), GRILLE, verts=8, parent=root)
    head = empty("mic_head", (0, 0, Z + 2.0), root)
    head.rotation_euler = (math.radians(-18), 0, 0)
    cyl(0.34, 0.55, (0, 0, 0), DARK, verts=16, parent=head)
    ico(0.36, (0, 0, 0.3), GRILLE, sub=2, parent=head)
    cyl(0.37, 0.1, (0, 0, -0.05), GOLD, verts=16, parent=head)
    ico(0.07, (0.0, -0.36, -0.15), ONAIR, sub=1, parent=head, name="GLOW_onair")

def temple(root):
    box((2.5, 1.7, 0.14), (0, 0, Z + 0.07), MARBLE, root)
    box((2.3, 1.5, 0.14), (0, 0, Z + 0.21), MARBLE, root)
    for x in (-0.95, -0.32, 0.32, 0.95):
        for y in (-0.6, 0.6):
            cyl(0.11, 1.15, (x, y, Z + 0.86), MARBLE, verts=10, parent=root)
    box((2.35, 1.55, 0.16), (0, 0, Z + 1.51), MARBLE, root)
    prism(1.22, 0.8, 0.5, (0, 0, Z + 1.59), MARBLE, root, "pediment")

def lighthouse(root):
    cyl(0.5, 2.3, (0, 0, Z + 1.15), WHITE, verts=14, r2=0.33, parent=root)
    for zc, r1, r2 in ((0.55, 0.47, 0.44), (1.35, 0.41, 0.38)):
        cyl(r1 + 0.02, 0.32, (0, 0, Z + zc), STRIPE, verts=14, r2=r2 + 0.02, parent=root)
    cyl(0.48, 0.08, (0, 0, Z + 2.34), DARK, verts=14, parent=root)
    cyl(0.24, 0.42, (0, 0, Z + 2.58), LAMP, verts=10, parent=root, name="GLOW_lamp")
    cyl(0.32, 0.4, (0, 0, Z + 2.98), STRIPE, verts=10, r2=0.0, parent=root)
    for i in range(5):
        a = i * 1.3
        ico(0.22 + 0.06 * (i % 2), (0.75 * math.cos(a), 0.75 * math.sin(a), Z + 0.05), ROCK, parent=root)

def trophy(root):
    box((0.75, 0.75, 0.7), (0, 0, Z + 0.35), DARK, root)
    cyl(0.14, 0.12, (0, 0, Z + 0.76), GOLD, verts=12, parent=root)
    cyl(0.05, 0.3, (0, 0, Z + 0.97), GOLD, verts=8, parent=root)
    cyl(0.14, 0.55, (0, 0, Z + 1.38), GOLD, verts=14, r2=0.38, parent=root)
    spin = empty("SPINY_star", (0, 0, Z + 2.0), root)
    ico(0.16, (0, 0, 0), GOLD, sub=0, parent=spin, scale=(1, 1, 1.4))

def sf_bridge(root):
    # Deck from the main island's east edge to the SF islet.
    x0, x1, y = 5.35, 8.0, -0.6
    deck_z = Z + 0.25
    box((x1 - x0, 0.5, 0.1), ((x0 + x1) / 2, y, deck_z), ORANGE, root)
    towers = (5.9, 7.45)
    top = deck_z + 1.55
    for tx in towers:
        for dy in (-0.2, 0.2):
            box((0.12, 0.12, 1.85), (tx, y + dy, deck_z + 0.75), ORANGE, root)
        for zz in (deck_z + 0.55, deck_z + 1.15, top):
            box((0.12, 0.46, 0.09), (tx, y, zz), ORANGE, root)
    for dy in (-0.22, 0.22):
        pts = []
        for i in range(9):
            s = i / 8
            x = towers[0] + s * (towers[1] - towers[0])
            pts.append((x, y + dy, top - 1.15 * 4 * s * (1 - s) + 0.0))
        for a, b in zip(pts, pts[1:]):
            rod(a, b, 0.025, ORANGE, parent=root, verts=5)
        rod((x0, y + dy, deck_z + 0.05), (towers[0], y + dy, top), 0.025, ORANGE, parent=root, verts=5)
        rod((towers[1], y + dy, top), (x1, y + dy, deck_z + 0.05), 0.025, ORANGE, parent=root, verts=5)
        for (x, _, zt) in pts[1:-1]:
            rod((x, y + dy, deck_z), (x, y + dy, zt), 0.012, ORANGE, parent=root, verts=4)

LANDMARKS = {
    "givelink": ((0.0, 0.2, 0), givelink),
    "aiops": ((-3.3, 2.0, 0), windmill),
    "podcast": ((2.7, 2.7, 0), podcast),
    "education": ((-2.8, -2.6, 0), temple),
    "oss": ((0.9, -4.2, 0), lighthouse),
    "recognition": ((-0.7, 4.3, 0), trophy),
    "sf": ((0, 0, 0), sf_bridge),
}
for lid, (loc, fn) in LANDMARKS.items():
    fn(empty(f"LM_{lid}", loc))

# Delivery van: built facing +x at the origin; the page drives it along the road to the door.
van = empty("VAN", (0, 0, 0))
box((0.62, 0.34, 0.3), (-0.05, 0, 0.27), VAN, van)
box((0.24, 0.32, 0.24), (0.34, 0, 0.24), WHITE, van)
box((0.02, 0.26, 0.12), (0.46, 0, 0.3), WINDOW, van)
ico(0.06, (-0.05, 0, 0.47), RED, sub=1, parent=van, scale=(1, 1, 0.6))
for wx in (-0.22, 0.3):
    for wy in (-0.17, 0.17):
        cyl(0.08, 0.06, (wx, wy, 0.08), TYRE, verts=10, parent=van, rot=(math.pi / 2, 0, 0))

# Little plane for the Athens <-> San Francisco loop, nose along +x.
plane = empty("PLANE", (0, 0, 0))
cyl(0.11, 0.9, (0, 0, 0), WHITE, verts=10, parent=plane, rot=(0, math.pi / 2, 0))
cyl(0.11, 0.2, (0.55, 0, 0), WHITE, verts=10, r2=0.02, parent=plane, rot=(0, math.pi / 2, 0))
box((0.22, 1.1, 0.03), (0.05, 0, 0), BLUE, plane)
box((0.12, 0.42, 0.025), (-0.4, 0, 0.02), BLUE, plane)
box((0.14, 0.025, 0.2), (-0.4, 0, 0.12), GOLD, plane)
box((0.5, 0.012, 0.03), (0, 0.112, 0.02), GOLD, plane)

# A stack of books beside the temple: decoration here, and the object on the Books page.
BOOKS_AT = (-4.25, -0.45)
books = empty("OBJ_books", (BOOKS_AT[0], BOOKS_AT[1], Z))
zb = 0.0
for i, (w, d, h, m, rot) in enumerate([(0.62, 0.44, 0.11, BLUE, 0.05), (0.56, 0.4, 0.1, GIFT1, -0.12), (0.6, 0.42, 0.12, GOLD, 0.2), (0.5, 0.36, 0.09, RED, -0.05)]):
    b = box((w, d, h), (0, 0, zb + h / 2), m, books, rot=(0, 0, rot))
    box((w - 0.04, d + 0.005, h - 0.03), (0.0, 0.0, zb + h / 2), MARBLE, books, rot=(0, 0, rot))
    box((w + 0.005, d - 0.05, h - 0.03), (0.0, 0.0, zb + h / 2), MARBLE, books, rot=(0, 0, rot))
    zb += h
apple = ico(0.07, (0.05, 0.0, zb + 0.06), RED, sub=1, parent=books)

# Cypresses on the SF islet sit outside the bridge root so the click target stays the bridge.
for (dx, dy) in [(0.4, 0.5), (-0.3, -0.6), (0.7, -0.3)]:
    cyl(0.18, 1.1, (9.2 + dx, -0.6 + dy, Z + 0.55), PINE, verts=7, r2=0.02)

# ---------- trees and paths ----------
def clear_of_landmarks(x, y, pad=1.55):
    for (lx, ly, _), _fn in LANDMARKS.values():
        if (x - lx) ** 2 + (y - ly) ** 2 < pad ** 2:
            return False
    if (x - BOOKS_AT[0]) ** 2 + (y - BOOKS_AT[1]) ** 2 < 0.9 ** 2:
        return False
    for (rx, ry) in ROAD:
        if (x - rx) ** 2 + (y - ry) ** 2 < 0.55 ** 2:
            return False
    return not (x > 4.6 and abs(y + 0.6) < 1.0)

ROAD = [(-2.0 + 2.3 * t / 20, -5.2 + 3.9 * t / 20) for t in range(21)]

placed = 0
tries = 0
while placed < 34 and tries < 2000:
    tries += 1
    a = random.uniform(0, 2 * math.pi)
    r = 5.1 * math.sqrt(random.uniform(0.05, 1))
    x, y = r * math.cos(a), r * math.sin(a)
    if not clear_of_landmarks(x, y):
        continue
    kind = random.random()
    zb = 0.24 - 0.22 * (r / 5.5)
    if kind < 0.45:   # cypress
        h = random.uniform(1.0, 1.6)
        cyl(0.2, h, (x, y, zb + h / 2), PINE, verts=7, r2=0.02)
    elif kind < 0.8:  # olive
        cyl(0.07, 0.5, (x, y, zb + 0.25), TRUNK, verts=6)
        ico(random.uniform(0.32, 0.45), (x, y, zb + 0.7), OLIVE, sub=1, scale=(1, 1, 0.8))
    else:             # round bush
        ico(random.uniform(0.22, 0.3), (x, y, zb + 0.15), GRASS2, sub=1, scale=(1, 1, 0.7))
    placed += 1

for (lx, ly, _), _fn in list(LANDMARKS.values())[1:6]:
    d = math.hypot(lx, ly)
    for k in range(1, 6):
        s = k / 6.0
        x = lx * s + random.uniform(-0.08, 0.08)
        y = ly * s + random.uniform(-0.08, 0.08)
        if math.hypot(x - lx, y - ly) < 1.0 or math.hypot(x, y) < 1.3:
            continue
        cyl(0.17, 0.05, (x, y, 0.24 - 0.2 * (math.hypot(x, y) / 5.5)), STONE, verts=7)

# The van's road: pale stones from the island edge to the Givelink door.
for (x, y) in ROAD[::2]:
    cyl(0.22, 0.045, (x, y, 0.245 - 0.2 * (math.hypot(x, y) / 5.5)), STONE, verts=8)

# ---------- clouds ----------
for i, (cx, cy, cz) in enumerate([(-8.5, 3.5, 3.2), (7.5, 5.5, 4.0), (-6.0, -7.0, 2.2), (3.5, -8.0, 4.6), (-2.0, 8.5, 5.0), (11.5, -4.5, 2.6)]):
    root = empty(f"CLOUD_{i}", (cx, cy, cz))
    for k in range(4):
        ico(random.uniform(0.45, 0.8), (k * 0.6 - 0.9, random.uniform(-0.3, 0.3), random.uniform(-0.15, 0.25)), CLOUD, sub=1, parent=root, scale=(1, 0.8, 0.65))

# ---------- export ----------
glb = os.path.join(out_dir, "island.glb")
bpy.ops.export_scene.gltf(filepath=glb, export_format="GLB", export_apply=True, export_cameras=False, export_lights=False)
print("EXPORTED", glb, os.path.getsize(glb))

# ---------- single-object exports for the other pages ----------
def tree(o):
    yield o
    for c in o.children:
        yield from tree(c)

def export_one(root_name, filename):
    bpy.ops.object.select_all(action="DESELECT")
    for o in tree(bpy.data.objects[root_name]):
        o.select_set(True)
    path = os.path.join(out_dir, filename)
    bpy.ops.export_scene.gltf(filepath=path, export_format="GLB", use_selection=True, export_apply=True, export_cameras=False, export_lights=False)
    print("EXPORTED", path, os.path.getsize(path))

for root_name, filename in [("LM_education", "obj-temple.glb"), ("LM_recognition", "obj-trophy.glb"), ("LM_podcast", "obj-mic.glb"), ("OBJ_books", "obj-books.glb"), ("PLANE", "obj-plane.glb")]:
    export_one(root_name, filename)

# PK coin for the loading screen: gold rim, Aegean-blue faces, raised gold "PK" on both sides. Not part of the island.
coin = empty("COIN", (0, 0, 40))
cyl(1.0, 0.2, (0, 0, 0), GOLD, verts=48, parent=coin)
cyl(0.84, 0.215, (0, 0, 0), BLUE, verts=48, parent=coin)
for side in (1, -1):
    bpy.ops.object.text_add(location=(0, 0, 0))
    t = bpy.context.active_object
    t.data.body = "PK"
    t.data.align_x = "CENTER"; t.data.align_y = "CENTER"
    t.data.size = 0.95
    t.data.extrude = 0.035
    t.data.bevel_depth = 0.008
    bpy.ops.object.convert(target="MESH")
    t = bpy.context.active_object
    t.location = (0, 0, side * 0.125)
    if side < 0:
        t.rotation_euler = (0, math.pi, 0)
    finish(t, GOLD, coin)
export_one("COIN", "obj-coin.glb")

# ---------- optional preview render (crashes headless on the 2014 Iris GPU; pass --preview on newer Macs) ----------
if "--preview" not in sys.argv:
    sys.exit(0)
scene = bpy.context.scene
cam = bpy.data.objects.new("PreviewCam", bpy.data.cameras.new("PreviewCam"))
bpy.context.collection.objects.link(cam)
cam.location = (15.5, -15.5, 10.5)
target = empty("PreviewTarget", (1.5, 0, -0.5))
c = cam.constraints.new("TRACK_TO")
c.target = target
c.track_axis = "TRACK_NEGATIVE_Z"
c.up_axis = "UP_Y"
cam.data.lens = 40
scene.camera = cam
scene.render.engine = "BLENDER_WORKBENCH"
scene.display.shading.color_type = "MATERIAL"
scene.display.shading.light = "STUDIO"
scene.display.shading.show_shadows = True
scene.display.shading.show_cavity = True
scene.render.resolution_x, scene.render.resolution_y = 1280, 800
scene.render.filepath = os.path.join(out_dir, "preview.png")
bpy.ops.render.render(write_still=True)
print("RENDERED", scene.render.filepath)
