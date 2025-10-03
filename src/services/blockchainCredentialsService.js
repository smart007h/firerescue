import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../config/supabaseClient';
import CryptoJS from 'crypto-js';

/**
 * Blockchain Emergency Credentials Service
 * Provides immutable incident records and verifiable emergency credentials
 */
class BlockchainCredentialsService {
  constructor() {
    this.blockchain = [];
    this.pendingTransactions = [];
    this.miningReward = 100;
    this.difficulty = 2; // Difficulty for proof-of-work
    this.credentialTypes = {
      FIREFIGHTER_CERTIFICATION: 'firefighter_cert',
      TRAINING_COMPLETION: 'training_cert',
      INCIDENT_RESPONSE: 'incident_response',
      EQUIPMENT_INSPECTION: 'equipment_inspect',
      SAFETY_COMPLIANCE: 'safety_compliance',
      EMERGENCY_AUTHORIZATION: 'emergency_auth'
    };
    this.initializeBlockchain();
  }

  /**
   * Initialize the blockchain with genesis block
   */
  initializeBlockchain() {
    // Create genesis block
    const genesisBlock = {
      index: 0,
      timestamp: Date.now(),
      data: {
        type: 'genesis',
        message: 'Fire Rescue Blockchain Genesis Block',
        version: '1.0.0'
      },
      previousHash: '0',
      hash: this.calculateHash(0, Date.now(), 'genesis', '0'),
      nonce: 0
    };

    this.blockchain = [genesisBlock];
  }

  /**
   * Create immutable incident record on blockchain
   * @param {Object} incidentData - Incident details
   * @param {Object} responseData - Response information
   * @returns {Promise<Object>} Blockchain transaction result
   */
  async createIncidentRecord(incidentData, responseData) {
    try {
      const incidentRecord = {
        type: 'INCIDENT_RECORD',
        incidentId: incidentData.id,
        timestamp: new Date().toISOString(),
        location: {
          latitude: incidentData.latitude,
          longitude: incidentData.longitude,
          address: incidentData.address
        },
        incident: {
          type: incidentData.type,
          severity: incidentData.severity,
          description: this.hashSensitiveData(incidentData.description),
          reportedBy: this.hashPersonalData(incidentData.reporter_id)
        },
        response: {
          dispatchTime: responseData.dispatchTime,
          arrivalTime: responseData.arrivalTime,
          resolutionTime: responseData.resolutionTime,
          unitsDeployed: responseData.unitsDeployed,
          personnelInvolved: responseData.personnelInvolved?.map(p => this.hashPersonalData(p)),
          resourcesUsed: responseData.resourcesUsed
        },
        verification: {
          witnesses: responseData.witnesses?.map(w => this.hashPersonalData(w)),
          supervisorApproval: responseData.supervisorApproval,
          qualityReview: responseData.qualityReview
        },
        metadata: {
          version: '1.0',
          jurisdiction: responseData.jurisdiction,
          regulatoryCompliance: responseData.compliance
        }
      };

      // Create blockchain transaction
      const transaction = await this.createTransaction(incidentRecord);
      
      // Mine the transaction into a block
      const block = await this.mineBlock([transaction]);
      
      // Verify and add to blockchain
      const verificationResult = await this.verifyAndAddBlock(block);

      // Store reference in database
      await this.storeBlockchainReference(incidentData.id, block.hash, 'incident_record');

      return {
        success: true,
        blockHash: block.hash,
        blockIndex: block.index,
        transactionId: transaction.id,
        immutableReference: `${block.index}:${block.hash}:${transaction.id}`,
        verificationResult
      };
    } catch (error) {
      console.error('Error creating incident record on blockchain:', error);
      throw new Error(`Failed to create blockchain incident record: ${error.message}`);
    }
  }

  /**
   * Issue verifiable training certificate
   * @param {Object} trainingData - Training completion data
   * @param {Object} recipientData - Certificate recipient information
   * @returns {Promise<Object>} Digital certificate with blockchain verification
   */
  async issueTrainingCertificate(trainingData, recipientData) {
    try {
      const certificate = {
        type: 'TRAINING_CERTIFICATE',
        certificateId: this.generateCertificateId(),
        issuedTo: {
          id: this.hashPersonalData(recipientData.id),
          name: this.hashPersonalData(recipientData.name),
          publicKey: recipientData.publicKey // For verification
        },
        training: {
          courseId: trainingData.courseId,
          courseName: trainingData.courseName,
          provider: trainingData.provider,
          completionDate: trainingData.completionDate,
          expirationDate: trainingData.expirationDate,
          competencies: trainingData.competencies,
          grade: trainingData.grade,
          instructorSignature: this.hashPersonalData(trainingData.instructorId)
        },
        accreditation: {
          authority: trainingData.accreditingAuthority,
          standardsCompliance: trainingData.standards,
          certificationLevel: trainingData.level
        },
        verification: {
          issuer: {
            organizationId: trainingData.issuingOrganization,
            authorizedBy: this.hashPersonalData(trainingData.authorizedBy),
            digitalSignature: await this.createDigitalSignature(trainingData)
          },
          witnesses: trainingData.witnesses?.map(w => this.hashPersonalData(w)),
          evidenceHash: await this.createEvidenceHash(trainingData.evidence)
        },
        blockchain: {
          issuedAt: new Date().toISOString(),
          validFrom: trainingData.validFrom || new Date().toISOString(),
          validUntil: trainingData.validUntil
        }
      };

      // Create blockchain transaction for certificate
      const transaction = await this.createTransaction(certificate);
      
      // Mine into block
      const block = await this.mineBlock([transaction]);
      
      // Add to blockchain
      await this.verifyAndAddBlock(block);

      // Generate verifiable certificate document
      const verifiableCertificate = await this.generateVerifiableCertificate(
        certificate,
        block,
        transaction
      );

      // Store in database for quick lookup
      await this.storeCertificateReference(
        certificate.certificateId,
        block.hash,
        transaction.id,
        recipientData.id,
        'training'
      );

      return {
        certificate: verifiableCertificate,
        blockchainProof: {
          blockHash: block.hash,
          blockIndex: block.index,
          transactionId: transaction.id,
          merkleProof: this.generateMerkleProof(transaction, block)
        },
        verificationInstructions: this.generateVerificationInstructions(certificate, block)
      };
    } catch (error) {
      console.error('Error issuing training certificate:', error);
      throw new Error(`Failed to issue blockchain certificate: ${error.message}`);
    }
  }

  /**
   * Verify certificate authenticity
   * @param {string} certificateId - Certificate identifier
   * @param {string} blockchainReference - Blockchain reference
   * @returns {Promise<Object>} Verification result
   */
  async verifyCertificate(certificateId, blockchainReference) {
    try {
      const [blockIndex, blockHash, transactionId] = blockchainReference.split(':');
      
      // Verify block exists and is valid
      const block = this.blockchain[parseInt(blockIndex)];
      if (!block || block.hash !== blockHash) {
        return {
          valid: false,
          reason: 'Block not found or hash mismatch',
          confidence: 0
        };
      }

      // Verify transaction exists in block
      const transaction = block.transactions?.find(t => t.id === transactionId);
      if (!transaction) {
        return {
          valid: false,
          reason: 'Transaction not found in block',
          confidence: 0
        };
      }

      // Verify certificate data integrity
      const certificateData = transaction.data;
      if (certificateData.certificateId !== certificateId) {
        return {
          valid: false,
          reason: 'Certificate ID mismatch',
          confidence: 0
        };
      }

      // Verify block integrity
      const blockIntegrity = this.verifyBlockIntegrity(block);
      if (!blockIntegrity.valid) {
        return {
          valid: false,
          reason: 'Block integrity compromised',
          confidence: 0
        };
      }

      // Verify certificate hasn't expired
      const now = new Date();
      const validUntil = new Date(certificateData.blockchain.validUntil);
      const isExpired = validUntil < now;

      // Check certificate status
      const certificateStatus = await this.getCertificateStatus(certificateId);

      return {
        valid: !isExpired && certificateStatus.active,
        certificate: certificateData,
        blockchainProof: {
          blockIndex: block.index,
          blockHash: block.hash,
          transactionId: transaction.id,
          timestamp: block.timestamp
        },
        verification: {
          blockIntegrity: blockIntegrity.valid,
          expired: isExpired,
          revoked: certificateStatus.revoked,
          lastVerified: new Date().toISOString()
        },
        confidence: this.calculateVerificationConfidence(block, transaction, certificateStatus)
      };
    } catch (error) {
      console.error('Error verifying certificate:', error);
      return {
        valid: false,
        reason: `Verification error: ${error.message}`,
        confidence: 0
      };
    }
  }

  /**
   * Create supply chain tracking for emergency equipment
   * @param {Object} equipmentData - Equipment information
   * @param {Array} supplyChainEvents - Chain of custody events
   * @returns {Promise<Object>} Supply chain blockchain record
   */
  async createSupplyChainRecord(equipmentData, supplyChainEvents) {
    try {
      const supplyChainRecord = {
        type: 'SUPPLY_CHAIN',
        equipmentId: equipmentData.id,
        equipment: {
          type: equipmentData.type,
          model: equipmentData.model,
          serialNumber: equipmentData.serialNumber,
          manufacturer: equipmentData.manufacturer,
          specifications: equipmentData.specifications
        },
        chain: supplyChainEvents.map(event => ({
          eventType: event.type,
          timestamp: event.timestamp,
          location: event.location,
          actor: this.hashPersonalData(event.actor),
          details: event.details,
          verification: event.verification,
          digitalSignature: event.signature
        })),
        authenticity: {
          manufacturerCertification: equipmentData.certification,
          qualityAssurance: equipmentData.qa,
          safetyCompliance: equipmentData.safety,
          regulatoryApproval: equipmentData.regulatory
        },
        currentStatus: {
          owner: this.hashPersonalData(equipmentData.currentOwner),
          location: equipmentData.currentLocation,
          condition: equipmentData.condition,
          lastInspection: equipmentData.lastInspection
        }
      };

      const transaction = await this.createTransaction(supplyChainRecord);
      const block = await this.mineBlock([transaction]);
      await this.verifyAndAddBlock(block);

      await this.storeBlockchainReference(
        equipmentData.id,
        block.hash,
        'supply_chain'
      );

      return {
        success: true,
        equipmentId: equipmentData.id,
        blockchainProof: {
          blockHash: block.hash,
          blockIndex: block.index,
          transactionId: transaction.id
        },
        supplyChainHash: this.calculateHash(JSON.stringify(supplyChainRecord)),
        verificationUrl: this.generateVerificationUrl(block.hash, transaction.id)
      };
    } catch (error) {
      console.error('Error creating supply chain record:', error);
      throw new Error(`Failed to create supply chain record: ${error.message}`);
    }
  }

  /**
   * Get complete audit trail for incident or certificate
   * @param {string} referenceId - Incident or certificate ID
   * @param {string} type - Type of record to audit
   * @returns {Promise<Array>} Complete audit trail
   */
  async getAuditTrail(referenceId, type) {
    try {
      // Find all blockchain records related to the reference
      const relatedBlocks = this.blockchain.filter(block => 
        block.transactions?.some(tx => 
          tx.data.incidentId === referenceId || 
          tx.data.certificateId === referenceId ||
          tx.data.equipmentId === referenceId
        )
      );

      const auditTrail = [];

      for (const block of relatedBlocks) {
        for (const transaction of block.transactions || []) {
          if (this.isRelatedTransaction(transaction, referenceId, type)) {
            auditTrail.push({
              blockIndex: block.index,
              blockHash: block.hash,
              blockTimestamp: new Date(block.timestamp).toISOString(),
              transactionId: transaction.id,
              transactionType: transaction.data.type,
              data: transaction.data,
              verification: {
                blockIntegrity: this.verifyBlockIntegrity(block).valid,
                transactionHash: this.calculateTransactionHash(transaction),
                merkleProof: this.generateMerkleProof(transaction, block)
              }
            });
          }
        }
      }

      // Sort by timestamp
      auditTrail.sort((a, b) => new Date(a.blockTimestamp) - new Date(b.blockTimestamp));

      return {
        referenceId,
        type,
        totalRecords: auditTrail.length,
        auditTrail,
        blockchainIntegrity: this.verifyBlockchainIntegrity(),
        generatedAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error getting audit trail:', error);
      throw new Error(`Failed to get audit trail: ${error.message}`);
    }
  }

  // Core blockchain methods

  async createTransaction(data) {
    const transaction = {
      id: this.generateTransactionId(),
      timestamp: Date.now(),
      data: data,
      hash: this.calculateTransactionHash({ data, timestamp: Date.now() })
    };

    this.pendingTransactions.push(transaction);
    return transaction;
  }

  async mineBlock(transactions) {
    const block = {
      index: this.blockchain.length,
      timestamp: Date.now(),
      transactions: transactions,
      previousHash: this.getLatestBlock().hash,
      nonce: 0
    };

    // Mine the block (proof-of-work)
    block.hash = this.mineBlockHash(block);
    
    return block;
  }

  mineBlockHash(block) {
    let hash;
    let nonce = 0;
    
    do {
      nonce++;
      block.nonce = nonce;
      hash = this.calculateBlockHash(block);
    } while (hash.substring(0, this.difficulty) !== Array(this.difficulty + 1).join('0'));

    return hash;
  }

  calculateBlockHash(block) {
    return CryptoJS.SHA256(
      block.index +
      block.previousHash +
      block.timestamp +
      JSON.stringify(block.transactions) +
      block.nonce
    ).toString();
  }

  calculateHash(index, timestamp, data, previousHash) {
    return CryptoJS.SHA256(index + previousHash + timestamp + data).toString();
  }

  calculateTransactionHash(transaction) {
    return CryptoJS.SHA256(
      transaction.timestamp + JSON.stringify(transaction.data)
    ).toString();
  }

  async verifyAndAddBlock(block) {
    const isValid = this.isValidBlock(block, this.getLatestBlock());
    
    if (isValid) {
      this.blockchain.push(block);
      this.pendingTransactions = []; // Clear pending transactions
      
      // Store blockchain state
      await this.saveBlockchainState();
      
      return { success: true, blockAdded: true };
    } else {
      return { success: false, reason: 'Invalid block' };
    }
  }

  isValidBlock(newBlock, previousBlock) {
    if (previousBlock.index + 1 !== newBlock.index) {
      return false;
    }

    if (previousBlock.hash !== newBlock.previousHash) {
      return false;
    }

    if (this.calculateBlockHash(newBlock) !== newBlock.hash) {
      return false;
    }

    return true;
  }

  getLatestBlock() {
    return this.blockchain[this.blockchain.length - 1];
  }

  verifyBlockIntegrity(block) {
    const calculatedHash = this.calculateBlockHash(block);
    return {
      valid: calculatedHash === block.hash,
      calculatedHash,
      storedHash: block.hash
    };
  }

  verifyBlockchainIntegrity() {
    for (let i = 1; i < this.blockchain.length; i++) {
      const currentBlock = this.blockchain[i];
      const previousBlock = this.blockchain[i - 1];

      if (!this.isValidBlock(currentBlock, previousBlock)) {
        return {
          valid: false,
          corruptedBlock: i,
          reason: 'Block chain integrity compromised'
        };
      }
    }

    return { valid: true, totalBlocks: this.blockchain.length };
  }

  // Utility methods

  hashSensitiveData(data) {
    return CryptoJS.SHA256(data).toString();
  }

  hashPersonalData(data) {
    // In production, use proper privacy-preserving hashing
    return CryptoJS.SHA256(data + 'privacy_salt').toString();
  }

  generateCertificateId() {
    return `CERT_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  }

  generateTransactionId() {
    return `TX_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  }

  async createDigitalSignature(data) {
    // Simulate digital signature creation
    return CryptoJS.SHA256(JSON.stringify(data) + 'signature_key').toString();
  }

  async createEvidenceHash(evidence) {
    if (!evidence || evidence.length === 0) return null;
    
    const evidenceString = evidence.map(e => JSON.stringify(e)).join('');
    return CryptoJS.SHA256(evidenceString).toString();
  }

  generateMerkleProof(transaction, block) {
    // Simplified Merkle proof generation
    const transactions = block.transactions || [];
    const index = transactions.findIndex(t => t.id === transaction.id);
    
    return {
      transactionIndex: index,
      totalTransactions: transactions.length,
      proof: CryptoJS.SHA256(JSON.stringify(transactions)).toString()
    };
  }

  calculateVerificationConfidence(block, transaction, certificateStatus) {
    let confidence = 0.8; // Base confidence

    // Increase confidence based on block age (older = more secure)
    const blockAge = Date.now() - block.timestamp;
    const ageBonus = Math.min(blockAge / (30 * 24 * 60 * 60 * 1000), 0.2); // Max 0.2 for 30+ days
    confidence += ageBonus;

    // Decrease confidence if certificate is revoked or suspended
    if (certificateStatus.revoked) confidence *= 0.1;
    if (certificateStatus.suspended) confidence *= 0.5;

    return Math.min(confidence, 1.0);
  }

  isRelatedTransaction(transaction, referenceId, type) {
    const data = transaction.data;
    return (
      data.incidentId === referenceId ||
      data.certificateId === referenceId ||
      data.equipmentId === referenceId ||
      (type && data.type === type)
    );
  }

  // Database integration methods

  async storeBlockchainReference(entityId, blockHash, recordType) {
    try {
      const { error } = await supabase
        .from('blockchain_references')
        .insert({
          entity_id: entityId,
          block_hash: blockHash,
          record_type: recordType,
          created_at: new Date().toISOString()
        });

      if (error) throw error;
    } catch (error) {
      console.error('Error storing blockchain reference:', error);
    }
  }

  async storeCertificateReference(certificateId, blockHash, transactionId, recipientId, certificateType = 'training') {
    try {
      const { error } = await supabase
        .from('blockchain_certificates')
        .insert({
          certificate_id: certificateId,
          certificate_type: certificateType,
          block_hash: blockHash,
          transaction_id: transactionId,
          recipient_id: recipientId,
          issuer_organization: 'Fire Rescue Department',
          certificate_data: { type: certificateType, issued_by: 'system' },
          created_at: new Date().toISOString()
        });

      if (error) throw error;
    } catch (error) {
      console.error('Error storing certificate reference:', error);
    }
  }

  async getCertificateStatus(certificateId) {
    try {
      const { data, error } = await supabase
        .from('certificate_status')
        .select('active, revoked, suspended')
        .eq('certificate_id', certificateId)
        .single();

      if (error) throw error;

      return data || { active: true, revoked: false, suspended: false };
    } catch (error) {
      console.error('Error getting certificate status:', error);
      return { active: true, revoked: false, suspended: false };
    }
  }

  async saveBlockchainState() {
    try {
      const state = {
        blockchain: this.blockchain,
        pendingTransactions: this.pendingTransactions,
        lastUpdated: new Date().toISOString()
      };

      await AsyncStorage.setItem('blockchain_state', JSON.stringify(state));
    } catch (error) {
      console.error('Error saving blockchain state:', error);
    }
  }

  async loadBlockchainState() {
    try {
      const stateJson = await AsyncStorage.getItem('blockchain_state');
      if (stateJson) {
        const state = JSON.parse(stateJson);
        this.blockchain = state.blockchain || [this.blockchain[0]]; // Keep genesis
        this.pendingTransactions = state.pendingTransactions || [];
      }
    } catch (error) {
      console.error('Error loading blockchain state:', error);
    }
  }

  generateVerificationUrl(blockHash, transactionId) {
    return `https://firerescue-blockchain.verify/${blockHash}/${transactionId}`;
  }

  generateVerificationInstructions(certificate, block) {
    return {
      steps: [
        'Visit the verification URL provided',
        'Enter the certificate ID and blockchain reference',
        'Review the verification results',
        'Check the certificate details and expiration date'
      ],
      verificationUrl: this.generateVerificationUrl(block.hash, certificate.certificateId),
      qrCode: `blockchain:verify:${certificate.certificateId}:${block.hash}`,
      contactInfo: 'For verification support, contact the issuing authority'
    };
  }

  async generateVerifiableCertificate(certificate, block, transaction) {
    return {
      ...certificate,
      blockchain: {
        ...certificate.blockchain,
        blockHash: block.hash,
        blockIndex: block.index,
        transactionId: transaction.id,
        verificationUrl: this.generateVerificationUrl(block.hash, transaction.id)
      },
      metadata: {
        generatedAt: new Date().toISOString(),
        format: 'blockchain-verifiable-certificate-v1',
        verification: 'This certificate can be verified on the blockchain'
      }
    };
  }
}

export default new BlockchainCredentialsService();
