const CHARACTERS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function generateMemberToken() {
  let token = "WINGS-";

  for (let index = 0; index < 8; index += 1) {
    const randomIndex = Math.floor(
      Math.random() * CHARACTERS.length
    );

    token += CHARACTERS[randomIndex];
  }

  return token;
}