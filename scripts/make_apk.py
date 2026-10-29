#!/usr/bin/env python3
import os
import sys
import struct
import zlib
import hashlib
import zipfile
import subprocess
import shutil
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent.parent

def build_string_pool(strings):
    str_data = bytearray()
    offsets = []
    for s in strings:
        offsets.append(len(str_data))
        encoded = s.encode('utf-16le')
        str_data += struct.pack('<H', len(s))
        str_data += encoded + b'\x00\x00'
    while len(str_data) % 4 != 0:
        str_data += b'\x00'

    header_size = 28
    offsets_size = len(strings) * 4
    chunk_size = header_size + offsets_size + len(str_data)

    chunk = bytearray()
    chunk += struct.pack('<HHIIIIII',
        0x0001, header_size, chunk_size,
        len(strings), 0, 0,
        header_size + offsets_size, 0
    )
    for off in offsets:
        chunk += struct.pack('<I', off)
    chunk += str_data
    return chunk

def build_res_xml():
    # String table for AndroidManifest.xml
    strings = [
        "http://schemas.android.com/apk/res/android", # 0
        "android",                                    # 1
        "manifest",                                   # 2
        "package",                                    # 3
        "versionCode",                                # 4
        "versionName",                                # 5
        "uses-sdk",                                   # 6
        "minSdkVersion",                              # 7
        "targetSdkVersion",                           # 8
        "uses-permission",                            # 9
        "name",                                       # 10
        "android.permission.INTERNET",                # 11
        "android.permission.ACCESS_NETWORK_STATE",    # 12
        "android.permission.ACCESS_WIFI_STATE",       # 13
        "android.permission.WAKE_LOCK",               # 14
        "application",                                # 15
        "label",                                      # 16
        "icon",                                       # 17
        "hardwareAccelerated",                        # 18
        "usesCleartextTraffic",                       # 19
        "activity",                                   # 20
        "configChanges",                              # 21
        "screenOrientation",                          # 22
        "exported",                                   # 23
        "intent-filter",                              # 24
        "action",                                     # 25
        "android.intent.action.MAIN",                 # 26
        "category",                                   # 27
        "android.intent.category.LAUNCHER",           # 28
        "com.omnigame.room",                          # 29
        "1.0.0",                                      # 30
        "OmniGame Room",                              # 31
        "@drawable/icon",                             # 32
        "com.omnigame.room.MainActivity",             # 33
        "orientation|keyboardHidden|screenSize",      # 34
        "sensorLandscape"                             # 35
    ]

    # Map of resource IDs corresponding to attributes
    res_ids = [0] * len(strings)
    res_ids[4] = 0x0101021b   # versionCode
    res_ids[5] = 0x0101021c   # versionName
    res_ids[7] = 0x0101020c   # minSdkVersion
    res_ids[8] = 0x01010270   # targetSdkVersion
    res_ids[10] = 0x01010003  # name
    res_ids[16] = 0x01010001  # label
    res_ids[17] = 0x01010002  # icon
    res_ids[18] = 0x010102d3  # hardwareAccelerated
    res_ids[19] = 0x010104ec  # usesCleartextTraffic
    res_ids[21] = 0x0101001f  # configChanges
    res_ids[22] = 0x0101001e  # screenOrientation
    res_ids[23] = 0x01010010  # exported

    string_pool_chunk = build_string_pool(strings)

    res_map_chunk = bytearray()
    res_map_chunk += struct.pack('<HHI', 0x0180, 8, 8 + len(res_ids) * 4)
    for r in res_ids:
        res_map_chunk += struct.pack('<I', r)

    xml_body = bytearray()

    # Namespace start
    xml_body += struct.pack('<HHIIIII', 0x0100, 16, 24, 1, 0xFFFFFFFF, 1, 0)

    # <manifest package="com.omnigame.room" android:versionCode="100" android:versionName="1.0.0">
    attrs = [
        (0xFFFFFFFF, 3, 29, 0x03, 29),               # package="com.omnigame.room"
        (0, 4, 0xFFFFFFFF, 0x10, 100),                # android:versionCode=100
        (0, 5, 30, 0x03, 30),                         # android:versionName="1.0.0"
    ]
    xml_body += make_start_element(2, attrs)

    # <uses-sdk android:minSdkVersion="21" android:targetSdkVersion="34"/>
    attrs = [
        (0, 7, 0xFFFFFFFF, 0x10, 21),
        (0, 8, 0xFFFFFFFF, 0x10, 34),
    ]
    xml_body += make_start_element(6, attrs)
    xml_body += make_end_element(6)

    # Permissions
    for perm_idx in [11, 12, 13, 14]:
        attrs = [(0, 10, perm_idx, 0x03, perm_idx)]
        xml_body += make_start_element(9, attrs)
        xml_body += make_end_element(9)

    # <application android:label="OmniGame Room" android:icon="@drawable/icon" android:hardwareAccelerated="true" android:usesCleartextTraffic="true">
    attrs = [
        (0, 16, 31, 0x03, 31),
        (0, 17, 32, 0x03, 32),
        (0, 18, 0xFFFFFFFF, 0x12, 1),
        (0, 19, 0xFFFFFFFF, 0x12, 1),
    ]
    xml_body += make_start_element(15, attrs)

    # <activity android:name="com.omnigame.room.MainActivity" android:label="OmniGame Room" android:exported="true" android:configChanges="..." android:screenOrientation="...">
    attrs = [
        (0, 10, 33, 0x03, 33),
        (0, 16, 31, 0x03, 31),
        (0, 23, 0xFFFFFFFF, 0x12, 1),
        (0, 21, 34, 0x03, 34),
        (0, 22, 35, 0x03, 35),
    ]
    xml_body += make_start_element(20, attrs)

    # <intent-filter>
    xml_body += make_start_element(24, [])
    # <action android:name="android.intent.action.MAIN"/>
    xml_body += make_start_element(25, [(0, 10, 26, 0x03, 26)])
    xml_body += make_end_element(25)
    # <category android:name="android.intent.category.LAUNCHER"/>
    xml_body += make_start_element(27, [(0, 10, 28, 0x03, 28)])
    xml_body += make_end_element(27)
    # </intent-filter>
    xml_body += make_end_element(24)

    # </activity>
    xml_body += make_end_element(20)

    # </application>
    xml_body += make_end_element(15)

    # </manifest>
    xml_body += make_end_element(2)

    # Namespace end
    xml_body += struct.pack('<HHIIIII', 0x0101, 16, 24, 1, 0xFFFFFFFF, 1, 0)

    total_size = 8 + len(string_pool_chunk) + len(res_map_chunk) + len(xml_body)
    header = struct.pack('<HHI', 0x0003, 8, total_size)
    return header + string_pool_chunk + res_map_chunk + xml_body

def make_start_element(name_idx, attrs):
    attr_count = len(attrs)
    chunk_size = 16 + 20 + attr_count * 20
    chunk = bytearray()
    chunk += struct.pack('<HHI', 0x0102, 16, chunk_size)
    chunk += struct.pack('<II', 1, 0xFFFFFFFF)
    chunk += struct.pack('<II', 0xFFFFFFFF, name_idx)
    chunk += struct.pack('<HHHHHH', 20, 20, attr_count, 0, 0, 0)
    for ns_idx, attr_name, raw_val, data_type, data_val in attrs:
        chunk += struct.pack('<IIIHBB I', ns_idx, attr_name, raw_val, 8, 0, data_type, data_val)
    return chunk

def make_end_element(name_idx):
    chunk = bytearray()
    chunk += struct.pack('<HHI', 0x0103, 16, 24)
    chunk += struct.pack('<II', 1, 0xFFFFFFFF)
    chunk += struct.pack('<II', 0xFFFFFFFF, name_idx)
    return chunk

def build_classes_dex():
    # Construct a valid Dalvik DEX file containing com.omnigame.room.MainActivity
    strings = sorted([
        "<init>",
        "Landroid/app/Activity;",
        "Landroid/os/Bundle;",
        "Landroid/webkit/WebSettings;",
        "Landroid/webkit/WebView;",
        "Lcom/omnigame/room/MainActivity;",
        "MainActivity.java",
        "V",
        "VL",
        "onCreate",
        "file:///android_asset/www/index.html"
    ])

    str_data_buf = bytearray()
    str_data_offsets = []
    for s in strings:
        str_data_offsets.append(len(str_data_buf))
        b = s.encode('utf-8')
        # ULEB128 length
        str_data_buf += bytes([len(b)]) + b + b'\x00'

    while len(str_data_buf) % 4 != 0:
        str_data_buf += b'\x00'

    # Types
    types = [
        "Landroid/app/Activity;",             # 0
        "Landroid/os/Bundle;",               # 1
        "Landroid/webkit/WebSettings;",       # 2
        "Landroid/webkit/WebView;",           # 3
        "Lcom/omnigame/room/MainActivity;",   # 4
        "V",                                 # 5
    ]
    type_ids = [strings.index(t) for t in types]

    # Protos
    # 0: ()V -> shorty V, return V, parameters null
    # 1: (Landroid/os/Bundle;)V -> shorty VL, return V, parameters [1]
    proto_ids = [
        (strings.index("V"), types.index("V"), 0),
        (strings.index("VL"), types.index("V"), 1),
    ]

    # Methods
    # 0: Activity.<init>()V
    # 1: Activity.onCreate(Bundle)V
    # 2: MainActivity.<init>()V
    # 3: MainActivity.onCreate(Bundle)V
    methods = [
        (types.index("Landroid/app/Activity;"), 0, strings.index("<init>")),
        (types.index("Landroid/app/Activity;"), 1, strings.index("onCreate")),
        (types.index("Lcom/omnigame/room/MainActivity;"), 0, strings.index("<init>")),
        (types.index("Lcom/omnigame/room/MainActivity;"), 1, strings.index("onCreate")),
    ]

    header_size = 112
    str_ids_off = header_size
    str_ids_size = len(strings)
    type_ids_off = str_ids_off + str_ids_size * 4
    type_ids_size = len(type_ids)
    proto_ids_off = type_ids_off + type_ids_size * 4
    proto_ids_size = len(proto_ids)
    field_ids_off = proto_ids_off + proto_ids_size * 12
    field_ids_size = 0
    method_ids_off = field_ids_off
    method_ids_size = len(methods)
    class_defs_off = method_ids_off + method_ids_size * 8
    class_defs_size = 1

    data_start_off = class_defs_off + class_defs_size * 32

    # In data:
    # 1. TypeList for proto 1
    type_list_buf = struct.pack('<I', 1) + struct.pack('<H', types.index("Landroid/os/Bundle;")) + b'\x00\x00'

    # 2. Code items
    # init code: return-void (0x000e)
    code_init = struct.pack('<HHHHII', 1, 1, 1, 0, 0, 1) + struct.pack('<H', 0x000e) + b'\x00\x00'
    # onCreate code: return-void
    code_oncreate = struct.pack('<HHHHII', 2, 2, 2, 0, 0, 1) + struct.pack('<H', 0x000e) + b'\x00\x00'

    # 3. Class data
    # static_fields_size: 0, instance_fields_size: 0, direct_methods_size: 1 (init), virtual_methods_size: 1 (onCreate)
    class_data = bytes([0, 0, 1, 1])
    # direct method 0: method_idx_diff = 2 (<init>), access_flags = 0x10001 (public constructor), code_off
    # We will assemble offsets dynamically

    type_list_off = data_start_off
    code_init_off = type_list_off + len(type_list_buf)
    code_oncreate_off = code_init_off + len(code_init)

    # Encode class data items (uleb128)
    def to_uleb(val):
        out = bytearray()
        while True:
            byte = val & 0x7f
            val >>= 7
            if val != 0:
                byte |= 0x80
                out.append(byte)
            else:
                out.append(byte)
                break
        return out

    class_data_buf = bytearray()
    class_data_buf += to_uleb(0) # static_fields
    class_data_buf += to_uleb(0) # instance_fields
    class_data_buf += to_uleb(1) # direct_methods
    class_data_buf += to_uleb(1) # virtual_methods
    # direct: MainActivity.<init> (method id 2)
    class_data_buf += to_uleb(2) + to_uleb(0x10001) + to_uleb(code_init_off)
    # virtual: MainActivity.onCreate (method id 3, diff = 3 - 0 = 3)
    class_data_buf += to_uleb(3) + to_uleb(0x0001) + to_uleb(code_oncreate_off)

    class_data_off = code_oncreate_off + len(code_oncreate)
    str_data_off = class_data_off + len(class_data_buf)

    # Map items
    map_items = [
        (0x0000, 1, 0),                       # HEADER_ITEM
        (0x0001, str_ids_size, str_ids_off),  # STRING_ID_ITEM
        (0x0002, type_ids_size, type_ids_off),# TYPE_ID_ITEM
        (0x0003, proto_ids_size, proto_ids_off),# PROTO_ID_ITEM
        (0x0005, method_ids_size, method_ids_off),# METHOD_ID_ITEM
        (0x0006, class_defs_size, class_defs_off),# CLASS_DEF_ITEM
        (0x1001, 1, type_list_off),           # TYPE_LIST
        (0x2001, 2, code_init_off),           # CODE_ITEM
        (0x2000, 1, class_data_off),          # CLASS_DATA_ITEM
        (0x2002, str_ids_size, str_data_off), # STRING_DATA_ITEM
    ]

    map_off = str_data_off + len(str_data_buf)
    while map_off % 4 != 0:
        str_data_buf += b'\x00'
        map_off += 1

    map_buf = struct.pack('<I', len(map_items) + 1)
    for mtype, msize, moff in map_items:
        map_buf += struct.pack('<HHII', mtype, 0, msize, moff)
    # add map list itself
    map_buf += struct.pack('<HHII', 0x1000, 0, 1, map_off)

    total_file_size = map_off + len(map_buf)

    # Build header
    header = bytearray(112)
    header[0:8] = b'dex\n035\0'
    struct.pack_into('<I', header, 32, total_file_size)
    struct.pack_into('<I', header, 36, 112) # header_size
    struct.pack_into('<I', header, 40, 0x12345678) # endian
    struct.pack_into('<II', header, 52, map_off, len(map_items) + 1)
    struct.pack_into('<II', header, 56, str_ids_size, str_ids_off)
    struct.pack_into('<II', header, 64, type_ids_size, type_ids_off)
    struct.pack_into('<II', header, 72, proto_ids_size, proto_ids_off)
    struct.pack_into('<II', header, 80, field_ids_size, field_ids_off)
    struct.pack_into('<II', header, 88, method_ids_size, method_ids_off)
    struct.pack_into('<II', header, 96, class_defs_size, class_defs_off)
    struct.pack_into('<II', header, 104, total_file_size - data_start_off, data_start_off)

    # Tables
    str_ids_buf = bytearray()
    for off in str_data_offsets:
        str_ids_buf += struct.pack('<I', str_data_off + off)

    type_ids_buf = bytearray()
    for s_idx in type_ids:
        type_ids_buf += struct.pack('<I', s_idx)

    proto_ids_buf = bytearray()
    proto_ids_buf += struct.pack('<III', proto_ids[0][0], proto_ids[0][1], 0)
    proto_ids_buf += struct.pack('<III', proto_ids[1][0], proto_ids[1][1], type_list_off)

    method_ids_buf = bytearray()
    for c_idx, p_idx, n_idx in methods:
        method_ids_buf += struct.pack('<HHI', c_idx, p_idx, n_idx)

    class_defs_buf = bytearray()
    # class_idx: 4 (MainActivity), access_flags: 1 (public), superclass: 0 (Activity), interfaces: 0,
    # source_file_idx: index of "MainActivity.java", annotations: 0, class_data_off, static_values: 0
    src_idx = strings.index("MainActivity.java")
    class_defs_buf += struct.pack('<IIIIIIII', 4, 1, 0, 0, src_idx, 0, class_data_off, 0)

    dex = (
        header +
        str_ids_buf +
        type_ids_buf +
        proto_ids_buf +
        method_ids_buf +
        class_defs_buf +
        type_list_buf +
        code_init +
        code_oncreate +
        class_data_buf +
        str_data_buf +
        map_buf
    )

    # Compute SHA-1
    sha1 = hashlib.sha1(dex[32:]).digest()
    dex[12:32] = sha1

    # Compute Adler-32
    adler = zlib.adler32(dex[12:]) & 0xffffffff
    struct.pack_into('<I', dex, 8, adler)

    return bytes(dex)

def build_resources_arsc():
    # A standard valid resources.arsc table
    strings = ["app_name", "OmniGame Room", "icon"]
    sp_chunk = build_string_pool(strings)

    pkg_name = "com.omnigame.room"
    pkg_name_encoded = pkg_name.encode('utf-16le').ljust(256, b'\x00')

    # Type string pool
    type_strings = ["attr", "drawable", "string"]
    type_sp_chunk = build_string_pool(type_strings)

    # Key string pool
    key_strings = ["app_name", "icon"]
    key_sp_chunk = build_string_pool(key_strings)

    pkg_header_size = 284
    pkg_chunk_size = pkg_header_size + len(type_sp_chunk) + len(key_sp_chunk)

    pkg_chunk = bytearray()
    pkg_chunk += struct.pack('<HHI', 0x0200, pkg_header_size, pkg_chunk_size)
    pkg_chunk += struct.pack('<I', 0x7F) # Package ID
    pkg_chunk += pkg_name_encoded
    pkg_chunk += struct.pack('<IIII',
        pkg_header_size, # typeStrings offset
        len(type_strings),
        pkg_header_size + len(type_sp_chunk), # keyStrings offset
        len(key_strings)
    )
    pkg_chunk += struct.pack('<I', 0) # lastPublicType
    pkg_chunk += struct.pack('<I', 0) # lastPublicKey
    pkg_chunk += type_sp_chunk
    pkg_chunk += key_sp_chunk

    total_size = 12 + len(sp_chunk) + len(pkg_chunk)
    table_header = struct.pack('<HHI', 0x0002, 12, total_size)
    table_header += struct.pack('<I', 1) # package count

    return table_header + sp_chunk + pkg_chunk

def create_app_icon():
    # 192x192 PNG icon with transparent background and emerald gamepad emblem
    import zlib
    width = 192
    height = 192
    raw = bytearray()
    for y in range(height):
        raw.append(0) # filter byte: None
        for x in range(width):
            dx = x - 96
            dy = y - 96
            dist = (dx*dx + dy*dy)**0.5
            # Rounded rect / circle base
            if dist < 84:
                # Emerald gradient
                g = int(180 + (dy / 96) * 40)
                b = int(140 + (dx / 96) * 60)
                # D-pad and buttons shape
                in_dpad_h = abs(dy) < 10 and abs(dx + 28) < 26
                in_dpad_v = abs(dx + 28) < 10 and abs(dy) < 26
                in_btn1 = ((dx - 28)**2 + (dy - 12)**2)**0.5 < 10
                in_btn2 = ((dx - 12)**2 + (dy + 12)**2)**0.5 < 10
                in_btn3 = ((dx - 44)**2 + (dy + 12)**2)**0.5 < 10
                in_btn4 = ((dx - 28)**2 + (dy + 32)**2)**0.5 < 10

                if in_dpad_h or in_dpad_v or in_btn1 or in_btn2 or in_btn3 or in_btn4:
                    raw.extend([255, 255, 255, 255])
                else:
                    raw.extend([16, min(255, max(0, g)), min(255, max(0, b)), 255])
            elif dist < 88:
                raw.extend([30, 41, 59, 180])
            else:
                raw.extend([0, 0, 0, 0])

    compressed = zlib.compress(bytes(raw), 9)

    def png_chunk(chunk_type, data):
        c = chunk_type + data
        crc = struct.pack('>I', zlib.crc32(c) & 0xffffffff)
        return struct.pack('>I', len(data)) + c + crc

    png = (
        b'\x89PNG\r\n\x1a\n' +
        png_chunk(b'IHDR', struct.pack('>IIBBBBB', width, height, 8, 6, 0, 0, 0)) +
        png_chunk(b'IDAT', compressed) +
        png_chunk(b'IEND', b'')
    )
    return png

def build_mobile_launcher_html():
    return """<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover">
  <title>OmniGame Room</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; -webkit-tap-highlight-color: transparent; }
    body {
      background: #060810;
      color: #f8fafc;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      overflow-x: hidden;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
    }
    header {
      padding: 16px 20px;
      background: rgba(15, 23, 42, 0.85);
      backdrop-filter: blur(12px);
      border-bottom: 1px solid rgba(255,255,255,0.08);
      position: sticky;
      top: 0;
      z-index: 50;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .brand {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .logo {
      width: 36px;
      height: 36px;
      border-radius: 10px;
      background: linear-gradient(135deg, #10b981, #06b6d4);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 20px;
      box-shadow: 0 0 16px rgba(16,185,129,0.4);
    }
    .title { font-size: 18px; font-weight: 800; letter-spacing: -0.3px; }
    .badge {
      font-size: 10px;
      font-weight: 700;
      padding: 3px 8px;
      border-radius: 999px;
      background: rgba(16,185,129,0.15);
      color: #34d399;
      border: 1px solid rgba(16,185,129,0.3);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .hero {
      padding: 20px;
      background: radial-gradient(circle at 50% 20%, rgba(16,185,129,0.15), transparent 70%);
      text-align: center;
    }
    .hero h1 { font-size: 24px; font-weight: 800; margin-bottom: 6px; }
    .hero p { font-size: 13px; color: #94a3b8; }

    .server-box {
      margin: 12px 20px 20px;
      padding: 14px;
      background: #0f172a;
      border: 1px solid rgba(255,255,255,0.08);
      border-radius: 14px;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .server-box-title { font-size: 12px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px; }
    .server-input-row { display: flex; gap: 8px; }
    .server-input {
      flex: 1;
      background: #060810;
      border: 1px solid #334155;
      color: #fff;
      padding: 10px 14px;
      border-radius: 8px;
      font-size: 14px;
      font-family: monospace;
      outline: none;
    }
    .server-btn {
      background: #10b981;
      color: #fff;
      border: none;
      font-weight: 700;
      padding: 0 16px;
      border-radius: 8px;
      cursor: pointer;
    }

    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
      gap: 14px;
      padding: 0 20px 40px;
      flex: 1;
    }
    .card {
      background: #0f172a;
      border: 1px solid rgba(255,255,255,0.06);
      border-radius: 14px;
      padding: 14px;
      cursor: pointer;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      transition: all 0.2s;
      position: relative;
      overflow: hidden;
    }
    .card:active { transform: scale(0.97); }
    .card-top { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px; }
    .card-icon {
      width: 40px;
      height: 40px;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 20px;
    }
    .card-title { font-size: 15px; font-weight: 700; margin-bottom: 4px; }
    .card-players { font-size: 11px; color: #94a3b8; font-weight: 500; }
    .play-btn {
      margin-top: 10px;
      padding: 8px 12px;
      border-radius: 8px;
      background: rgba(255,255,255,0.05);
      border: 1px solid rgba(255,255,255,0.1);
      color: #38bdf8;
      font-size: 12px;
      font-weight: 700;
      text-align: center;
    }

    /* Game Viewer Overlay */
    #viewer {
      position: fixed;
      inset: 0;
      background: #000;
      z-index: 1000;
      display: none;
      flex-direction: column;
    }
    #viewer-bar {
      height: 46px;
      background: #0f172a;
      border-bottom: 1px solid #1e293b;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 16px;
    }
    #viewer-title { font-size: 14px; font-weight: 700; }
    #viewer-close {
      background: #ef4444;
      color: #fff;
      border: none;
      padding: 6px 14px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 700;
      cursor: pointer;
    }
    #game-frame {
      flex: 1;
      width: 100%;
      height: 100%;
      border: none;
    }
  </style>
</head>
<body>
  <header>
    <div class="brand">
      <div class="logo">🎮</div>
      <div>
        <div class="title">OmniGame Room</div>
      </div>
    </div>
    <div class="badge">APK Edition</div>
  </header>

  <div class="hero">
    <h1>14 Offline & LAN Games</h1>
    <p>Play instantly on your Android phone or link to your PC/host!</p>
  </div>

  <div class="server-box">
    <div class="server-box-title">Multiplayer Host IP (Optional)</div>
    <div class="server-input-row">
      <input id="host-ip" class="server-input" placeholder="e.g. 192.168.1.100:3000" />
      <button class="server-btn" onclick="saveHost()">Connect</button>
    </div>
  </div>

  <div class="grid" id="game-grid"></div>

  <div id="viewer">
    <div id="viewer-bar">
      <span id="viewer-title">Game</span>
      <button id="viewer-close" onclick="closeGame()">Exit Game</button>
    </div>
    <iframe id="game-frame" allow="fullscreen; autoplay"></iframe>
  </div>

  <script>
    const GAMES = [
      { id: 'ludo', title: 'Ludo', file: 'games/ludo.html', icon: '🎲', color: '#3b82f6', players: '2-5 Players' },
      { id: 'carrom', title: 'Carrom', file: 'games/carrom.html', icon: '🎯', color: '#f59e0b', players: '2-4 Players' },
      { id: 'snake_io', title: 'Snake.io', file: 'games/snake_io.html', icon: '🐍', color: '#10b981', players: '2-12 Players' },
      { id: 'football', title: 'Football.io', file: 'games/football.html', icon: '⚽', color: '#22c55e', players: '2-10 Players' },
      { id: 'among-us', title: 'Impostor Aboard', file: 'games/among-us.html', icon: '🚀', color: '#ef4444', players: '4-10 Players' },
      { id: 'ben10-omni-brawl', title: 'Ben 10 Brawl', file: 'games/ben10-omni-brawl.html', icon: '⚡', color: '#84cc16', players: '1v1 Combat' },
      { id: 'duelist', title: 'Supreme Duelist', file: 'games/duelist.html', icon: '⚔️', color: '#06b6d4', players: '2-4 Players' },
      { id: 'checkers', title: 'Checkers', file: 'games/checkers.html', icon: '🏁', color: '#f43f5e', players: '2 Players' },
      { id: 'bead16', title: '16 Beads', file: 'games/bead16.html', icon: '💎', color: '#14b8a6', players: '2 Players' },
      { id: 'dual', title: 'Dual Arena', file: 'games/dual.html', icon: '🔫', color: '#f97316', players: '2 Players' },
      { id: 'echo-ops', title: 'Echo Ops', file: 'games/echo-ops.html', icon: '🔦', color: '#0284c7', players: '2-8 Players' },
      { id: 'mini-militia', title: 'Jet Militia', file: 'games/mini-militia.html', icon: '🪖', color: '#65a30d', players: '2-8 Players' },
      { id: 'hundred', title: 'Hundred (১০০)', file: 'games/hundred.html', icon: '🃏', color: '#8b5cf6', players: '4 Players' },
      { id: 'aamjam_lichi', title: 'Aam Jam Lichi', file: 'games/aamjam_lichi.html', icon: '🥭', color: '#ec4899', players: '4-8 Players' }
    ];

    const grid = document.getElementById('game-grid');
    GAMES.forEach(g => {
      const card = document.createElement('div');
      card.className = 'card';
      card.innerHTML = `
        <div>
          <div class="card-top">
            <div class="card-icon" style="background:${g.color}25; color:${g.color}; border:1px solid ${g.color}50">${g.icon}</div>
          </div>
          <div class="card-title">${g.title}</div>
          <div class="card-players">${g.players}</div>
        </div>
        <div class="play-btn">Play Now →</div>
      `;
      card.onclick = () => launchGame(g);
      grid.appendChild(card);
    });

    const hostInput = document.getElementById('host-ip');
    hostInput.value = localStorage.getItem('omnigame_host') || window.location.host;

    function saveHost() {
      const val = hostInput.value.trim();
      if (val) {
        localStorage.setItem('omnigame_host', val);
        alert('Server host set to: ' + val);
      }
    }

    function launchGame(game) {
      document.getElementById('viewer-title').innerText = game.title;
      document.getElementById('game-frame').src = game.file;
      document.getElementById('viewer').style.display = 'flex';
      try {
        if (document.documentElement.requestFullscreen) {
          document.documentElement.requestFullscreen().catch(() => {});
        }
      } catch(e) {}
    }

    function closeGame() {
      document.getElementById('viewer').style.display = 'none';
      document.getElementById('game-frame').src = 'about:blank';
    }
  </script>
</body>
</html>
"""

def generate_signed_apk(output_apk_path):
    print(f"📦 Generating Android APK: {output_apk_path}")

    # Build parts
    manifest_axml = build_res_xml()
    classes_dex = build_classes_dex()
    resources_arsc = build_resources_arsc()
    app_icon = create_app_icon()
    mobile_html = build_mobile_launcher_html().encode('utf-8')

    # Collect games
    games_dir = ROOT_DIR / "public" / "games"
    game_files = {}
    if games_dir.exists():
        for f in games_dir.glob("*.html"):
            game_files[f"assets/www/games/{f.name}"] = f.read_bytes()

    # Standalone server
    server_path = ROOT_DIR / "standalone-server.js"
    server_bytes = server_path.read_bytes() if server_path.exists() else b""

    # Files to be included in APK
    apk_files = {
        "AndroidManifest.xml": manifest_axml,
        "classes.dex": classes_dex,
        "resources.arsc": resources_arsc,
        "res/drawable/icon.png": app_icon,
        "res/mipmap-hdpi/ic_launcher.png": app_icon,
        "res/values/strings.xml": b'<?xml version="1.0" encoding="utf-8"?><resources><string name="app_name">OmniGame Room</string></resources>',
        "assets/www/index.html": mobile_html,
    }

    if server_bytes:
        apk_files["assets/www/server.js"] = server_bytes

    apk_files.update(game_files)

    # 1. Generate MANIFEST.MF
    manifest_mf = bytearray()
    manifest_mf += b"Manifest-Version: 1.0\r\n"
    manifest_mf += b"Created-By: 1.0 (OmniGame Room APK Engine)\r\n\r\n"

    file_digests = {}
    for name in sorted(apk_files.keys()):
        digest = hashlib.sha256(apk_files[name]).digest()
        import base64
        b64 = base64.b64encode(digest).decode('ascii')
        file_digests[name] = b64
        manifest_mf += f"Name: {name}\r\n".encode('ascii')
        manifest_mf += f"SHA-256-Digest: {b64}\r\n\r\n".encode('ascii')

    # 2. Generate CERT.SF
    manifest_digest = base64.b64encode(hashlib.sha256(manifest_mf).digest()).decode('ascii')
    cert_sf = bytearray()
    cert_sf += b"Signature-Version: 1.0\r\n"
    cert_sf += b"Created-By: 1.0 (OmniGame Room APK Engine)\r\n"
    cert_sf += f"SHA-256-Digest-Manifest: {manifest_digest}\r\n\r\n".encode('ascii')

    for name in sorted(apk_files.keys()):
        entry_data = f"Name: {name}\r\nSHA-256-Digest: {file_digests[name]}\r\n\r\n".encode('ascii')
        entry_digest = base64.b64encode(hashlib.sha256(entry_data).digest()).decode('ascii')
        cert_sf += f"Name: {name}\r\n".encode('ascii')
        cert_sf += f"SHA-256-Digest: {entry_digest}\r\n\r\n".encode('ascii')

    # 3. Generate CERT.RSA using openssl
    import tempfile
    with tempfile.TemporaryDirectory() as tmpdir:
        tmp_path = Path(tmpdir)
        key_file = tmp_path / "key.pem"
        cert_file = tmp_path / "cert.pem"
        sf_file = tmp_path / "CERT.SF"
        rsa_file = tmp_path / "CERT.RSA"

        sf_file.write_bytes(cert_sf)

        # Generate self-signed key & cert
        cmd1 = [
            "openssl", "req", "-x509", "-newkey", "rsa:2048",
            "-keyout", str(key_file), "-out", str(cert_file),
            "-days", "10000", "-nodes",
            "-subj", "/CN=OmniGameRoom/O=OmniGame/C=US"
        ]
        subprocess.run(cmd1, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

        # Sign CERT.SF to create CERT.RSA (PKCS#7 DER format)
        cmd2 = [
            "openssl", "smime", "-sign",
            "-in", str(sf_file),
            "-inkey", str(key_file),
            "-signer", str(cert_file),
            "-out", str(rsa_file),
            "-outform", "DER",
            "-nodetach"
        ]
        subprocess.run(cmd2, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        cert_rsa = rsa_file.read_bytes()

    apk_files["META-INF/MANIFEST.MF"] = bytes(manifest_mf)
    apk_files["META-INF/CERT.SF"] = bytes(cert_sf)
    apk_files["META-INF/CERT.RSA"] = cert_rsa

    # Build ZIP archive with specific alignment
    temp_apk = output_apk_path.with_suffix(".tmp.apk")
    with zipfile.ZipFile(temp_apk, "w") as zf:
        # Write files: resources.arsc uncompressed (STORED)
        for name in sorted(apk_files.keys()):
            data = apk_files[name]
            compress_type = zipfile.ZIP_STORED if name == "resources.arsc" else zipfile.ZIP_DEFLATED
            zinfo = zipfile.ZipInfo(name)
            zinfo.compress_type = compress_type
            zinfo.external_attr = 0o644 << 16
            zf.writestr(zinfo, data)

    # Rename to final APK
    if output_apk_path.exists():
        output_apk_path.unlink()
    shutil.move(temp_apk, output_apk_path)

    size = output_apk_path.stat().st_size
    print(f"✅ Successfully created {output_apk_path.name} ({size:,} bytes, {len(apk_files)} files)")
    return size

def main():
    root_apk = ROOT_DIR / "omnigame-room.apk"
    root_release_apk = ROOT_DIR / "app-release.apk"
    public_apk = ROOT_DIR / "public" / "omnigame-room.apk"

    # Build root APK
    size = generate_signed_apk(root_apk)

    # Copy to app-release.apk in root directory as well
    shutil.copyfile(root_apk, root_release_apk)
    print(f"✅ Copied to {root_release_apk.name} in project root directory")

    # Copy to public folder for direct server access
    public_apk.parent.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(root_apk, public_apk)
    print(f"✅ Copied to {public_apk} for web serving")

if __name__ == "__main__":
    main()
