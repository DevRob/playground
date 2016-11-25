import random
prohibited_characters = [x for x in range(33)]
print prohibited_characters
def pwdGen(length, password):
    character = int(random.random() * 1000)%255
    if character in prohibited_characters:
        return pwdGen(length, password)
    else: 
        if length == 0:
            return password
        else:
            password.append(chr(character))
    return pwdGen(length - 1, password)

print pwdGen(10, [])
