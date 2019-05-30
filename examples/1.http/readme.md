## Get started
### Prepair crackme server
```bash
node ./crackme
```

### Crack Plain Text
```bash
padoracle ./challenge.js --iv-cipher $(curl http://localhost:3000/token -s) --size 16
```

### Modify Plain Text
```bash
padoracle ./challenge.js --size 16 --plain "{\"id\":1,\"roleAdmin\":true,\"name\":\"yelo\",\"url\":\"https://yelo.cc\"}"
```

Or just:
```bash
padoracle ./challenge.js --size 16 --plain "{\"roleAdmin\":1}"
# IV (hex): f2f3b43a1a14d81de52c59d3c132201b
# Cipher (hex): ffffffffffffffffffffffffffffffff
# IV-Cipher (base64): 8vO0OhoU2B3lLFnTwTIgG/////////////////////8=
```

### Verify Result
```bash
curl -X POST http://localhost:3000/flag -d "8vO0OhoU2B3lLFnTwTIgG/////////////////////8="
# {FLAG}
```
