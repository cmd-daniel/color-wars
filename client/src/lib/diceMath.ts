// src/lib/math.ts
// Math primitives and utilities used by the dice system.

export class Quaternion {
    x: number;
    y: number;
    z: number;
    w: number;
  
    constructor(x = 0, y = 0, z = 0, w = 1) {
      this.x = x;
      this.y = y;
      this.z = z;
      this.w = w;
    }
  
    clone(): Quaternion {
      return new Quaternion(this.x, this.y, this.z, this.w);
    }
  
    conjugate(): Quaternion {
      return new Quaternion(-this.x, -this.y, -this.z, this.w);
    }
  
    multiply(q: Quaternion): Quaternion {
      const x = this.w * q.x + this.x * q.w + this.y * q.z - this.z * q.y;
      const y = this.w * q.y - this.x * q.z + this.y * q.w + this.z * q.x;
      const z = this.w * q.z + this.x * q.y - this.y * q.x + this.z * q.w;
      const w = this.w * q.w - this.x * q.x - this.y * q.y - this.z * q.z;
      return new Quaternion(x, y, z, w);
    }
  
    normalize(): this {
      const len = Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z + this.w * this.w);
      if (len > 0) {
        this.x /= len;
        this.y /= len;
        this.z /= len;
        this.w /= len;
      }
      return this;
    }
  
    setFromAxisAngle(axis: Vector3, angle: number): this {
      const halfAngle = angle / 2;
      const s = Math.sin(halfAngle);
      this.x = axis.x * s;
      this.y = axis.y * s;
      this.z = axis.z * s;
      this.w = Math.cos(halfAngle);
      return this;
    }
  
    slerp(target: Quaternion, t: number): this {
      let cosHalfTheta = this.w * target.w + this.x * target.x + this.y * target.y + this.z * target.z;
  
      let targetW: number, targetX: number, targetY: number, targetZ: number;
      if (cosHalfTheta < 0) {
        targetW = -target.w;
        targetX = -target.x;
        targetY = -target.y;
        targetZ = -target.z;
        cosHalfTheta = -cosHalfTheta;
      } else {
        targetW = target.w;
        targetX = target.x;
        targetY = target.y;
        targetZ = target.z;
      }
  
      if (cosHalfTheta >= 1.0) {
        return this;
      }
  
      const halfTheta = Math.acos(cosHalfTheta);
      const sinHalfTheta = Math.sqrt(1.0 - cosHalfTheta * cosHalfTheta);
  
      if (Math.abs(sinHalfTheta) < 0.001) {
        this.w = 0.5 * (this.w + targetW);
        this.x = 0.5 * (this.x + targetX);
        this.y = 0.5 * (this.y + targetY);
        this.z = 0.5 * (this.z + targetZ);
        return this;
      }
  
      const ratioA = Math.sin((1 - t) * halfTheta) / sinHalfTheta;
      const ratioB = Math.sin(t * halfTheta) / sinHalfTheta;
  
      const originalW = this.w;
      const originalX = this.x;
      const originalY = this.y;
      const originalZ = this.z;
  
      this.w = originalW * ratioA + targetW * ratioB;
      this.x = originalX * ratioA + targetX * ratioB;
      this.y = originalY * ratioA + targetY * ratioB;
      this.z = originalZ * ratioA + targetZ * ratioB;
  
      return this;
    }
  
    toCSSMatrix(): string {
      const x = this.x, y = this.y, z = this.z, w = this.w;
      const x2 = x + x, y2 = y + y, z2 = z + z;
      const xx = x * x2, xy = x * y2, xz = x * z2;
      const yy = y * y2, yz = y * z2, zz = z * z2;
      const wx = w * x2, wy = w * y2, wz = w * z2;
  
      const matrix = [
        1 - (yy + zz), xy + wz, xz - wy, 0,
        xy - wz, 1 - (xx + zz), yz + wx, 0,
        xz + wy, yz - wx, 1 - (xx + yy), 0,
        0, 0, 0, 1
      ];
  
      return `matrix3d(${matrix.join(',')})`;
    }
  }
  
  export class Vector3 {
    x: number;
    y: number;
    z: number;
  
    constructor(x = 0, y = 0, z = 0) {
      this.x = x;
      this.y = y;
      this.z = z;
    }
  
    clone(): Vector3 {
      return new Vector3(this.x, this.y, this.z);
    }
  
    dot(v: Vector3): number {
      return this.x * v.x + this.y * v.y + this.z * v.z;
    }
  
    normalize(): this {
      const len = Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z);
      if (len > 0) {
        this.x /= len;
        this.y /= len;
        this.z /= len;
      }
      return this;
    }
  
    applyQuaternion(q: Quaternion): this {
      const x = this.x, y = this.y, z = this.z;
      const qx = q.x, qy = q.y, qz = q.z, qw = q.w;
  
      const ix = qw * x + qy * z - qz * y;
      const iy = qw * y + qz * x - qx * z;
      const iz = qw * z + qx * y - qy * x;
      const iw = -qx * x - qy * y - qz * z;
  
      this.x = ix * qw + iw * -qx + iy * -qz - iz * -qy;
      this.y = iy * qw + iw * -qy + iz * -qx - ix * -qz;
      this.z = iz * qw + iw * -qz + ix * -qy - iy * -qx;
  
      return this;
    }
  }
  
  export const swingTwistDecomposition = (quaternion: Quaternion, axis: Vector3) => {
    const d = axis.clone().normalize();
    const p = new Vector3(quaternion.x, quaternion.y, quaternion.z);
    const dot = p.dot(d);
  
    if (Math.abs(dot) < 1e-6 && Math.abs(quaternion.w) < 1e-6) {
      return {
        swing: quaternion.clone(),
        twist: new Quaternion(0, 0, 0, 1)
      };
    }
  
    const twist = new Quaternion(d.x * dot, d.y * dot, d.z * dot, quaternion.w).normalize();
    const swing = quaternion.clone().multiply(twist.conjugate());
  
    return { swing, twist };
  };
  
  export const getRotationBetweenVectors = (from: Vector3, to: Vector3): Quaternion => {
    const quaternion = new Quaternion();
    const dotProduct = from.dot(to);
  
    if (dotProduct < -0.999999) {
      const rotationAxis = new Vector3(1, 0, 0);
      quaternion.setFromAxisAngle(rotationAxis, Math.PI);
    } else {
      const cross = new Vector3(
        from.y * to.z - from.z * to.y,
        from.z * to.x - from.x * to.z,
        from.x * to.y - from.y * to.x
      );
      const w = Math.sqrt(from.dot(from) * to.dot(to)) + dotProduct;
      quaternion.x = cross.x;
      quaternion.y = cross.y;
      quaternion.z = cross.z;
      quaternion.w = w;
      quaternion.normalize();
    }
  
    return quaternion;
  };
  